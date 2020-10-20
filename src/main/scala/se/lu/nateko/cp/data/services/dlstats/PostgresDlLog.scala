package se.lu.nateko.cp.data.services.dlstats

import se.lu.nateko.cp.data.DownloadStatsConfig
import se.lu.nateko.cp.data.CredentialsConfig
import se.lu.nateko.cp.meta.core.data.Agent
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.L2OrLessSpecificMeta
import se.lu.nateko.cp.meta.core.data.L3SpecificMeta
import se.lu.nateko.cp.data.routes.StatsRouting._

import akka.Done
import akka.event.LoggingAdapter

import scala.util.Try
import scala.util.Success
import scala.util.Failure
import scala.io.Source
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import java.nio.file.Files
import java.nio.file.Paths
import java.sql.Connection
import java.sql.DriverManager
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Statement
import java.sql.Types
import java.time.ZoneOffset
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.ArrayBlockingQueue

import org.postgresql.ds.PGConnectionPoolDataSource
import org.apache.commons.dbcp2.datasources.SharedPoolDataSource
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

class PostgresDlLog(conf: DownloadStatsConfig, log: LoggingAdapter) extends AutoCloseable{

	private[this] val executor = {
		val maxThreads = conf.dbAccessPoolSize * conf.dbNames.size
		new ThreadPoolExecutor(
			1, maxThreads, 30, TimeUnit.SECONDS, new ArrayBlockingQueue[Runnable](maxThreads)
		)
	}

	private[this] val scheduler = Executors.newSingleThreadScheduledExecutor()

	private[this] implicit val exeCtxt = ExecutionContext.fromExecutor(executor)

	private[this] val dataSources: Map[Envri, SharedPoolDataSource] = conf.dbNames.view.mapValues{ dbName =>
		val pgDs = new PGConnectionPoolDataSource()
		pgDs.setServerNames(Array(conf.hostname))
		pgDs.setDatabaseName(dbName)
		pgDs.setPortNumbers(Array(conf.port))
		val ds = new SharedPoolDataSource()
		ds.setMaxTotal(conf.dbAccessPoolSize)
		ds.setDefaultMinIdle(1)
		ds.setDefaultMaxIdle(2)
		ds.setConnectionPoolDataSource(pgDs)
		ds.setDefaultAutoCommit(false)
		ds
	}.toMap

	override def close(): Unit = {
		executor.shutdown()
		scheduler.shutdown()
		dataSources.valuesIterator.foreach{_.close()}
	}

	def initLogTables(): Future[Done] = {
		val query = Source.fromResource("sql/logging/initLogTables.sql").mkString
		val matViews = Seq(
			"downloads_country_mv", "downloads_timebins_mv", "dlstats_mv",
			"dlstats_full_mv", "specifications_mv", "contributors_mv", "stations_mv",
			"submitters_mv"
		)

		val futs = conf.dbNames.keys.map{implicit envri =>
			withConnection(conf.admin)(conn => {
				conn.createStatement().execute(query)
				conn.commit()
			}).map{_ =>
				scheduler.scheduleWithFixedDelay(() => matViews.foreach(updateMatView), 3, 60, TimeUnit.MINUTES)
			}
		}.toIndexedSeq
		Future.sequence(futs).map{_ => Done}
	}

	def writeDobjInfo(dobj: DataObject)(implicit envri: Envri): Future[Done] = {
		execute(conf.writer)(conn => {
			val dobjsQuery = """
				|INSERT INTO dobjs(hash_id, spec, submitter, station)
				|VALUES (?, ?, ?, ?)
				|ON CONFLICT (hash_id) DO UPDATE
				|	SET spec = EXCLUDED.spec, submitter = EXCLUDED.submitter, station = EXCLUDED.station
				|""".stripMargin
			val dobjsSt = conn.prepareStatement(dobjsQuery)
			val deleteContribSt = conn.prepareStatement("DELETE FROM contributors WHERE hash_id = ?")
			val insertContribSt = conn.prepareStatement("INSERT INTO contributors(hash_id, contributor) VALUES (?, ?)")

			try {
				val Seq(hash_id, spec, submitter, station) = 1 to 4

				val contribs: Seq[Agent] = (
					dobj.references.authors.toSeq.flatten ++
					dobj.specificInfo.fold(
						_.productionInfo.contributors,
						_.productionInfo.toSeq.flatMap(_.contributors)
					)
				)

				dobjsSt.setString(hash_id, dobj.hash.id)
				dobjsSt.setString(spec, dobj.specification.self.uri.toString)
				dobjsSt.setString(submitter, dobj.submission.submitter.self.uri.toString)
				dobj.specificInfo match {
					case Left(_) => dobjsSt.setNull(station, Types.VARCHAR)
					case Right(lessSpecific) => dobjsSt.setString(station, lessSpecific.acquisition.station.org.self.uri.toString)
				}
				dobjsSt.executeUpdate()

				deleteContribSt.setString(1, dobj.hash.id)
				deleteContribSt.executeUpdate()

				for (contributor <- contribs.map(_.self.uri.toString).distinct){
					insertContribSt.setString(1, dobj.hash.id)
					insertContribSt.setString(2, contributor)
					insertContribSt.addBatch()
				}

				insertContribSt.executeBatch()

			} finally {
				dobjsSt.close()
				deleteContribSt.close()
				insertContribSt.close()
			}
		})
	}

	def downloadsByCountry(queryParams: StatsQueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadsByCountry]] =
		runAnalyticalQuery("SELECT count, country_code FROM downloadsByCountry", Some(queryParams)){rs =>
			DownloadsByCountry(rs.getInt("count"), rs.getString("country_code"))
		}

	def downloadsPerWeek(queryParams: StatsQueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadsPerWeek]] =
		runAnalyticalQuery("SELECT count, day, week FROM downloadsperweek", Some(queryParams)){rs =>
			DownloadsPerWeek(rs.getInt("count"), rs.getDate("day").toLocalDate.atStartOfDay(ZoneOffset.UTC).toInstant, rs.getDouble("week"))
		}

	def downloadsPerMonth(queryParams: StatsQueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadsPerTimeframe]] =
		runAnalyticalQuery("SELECT count, day FROM downloadsPerMonth", Some(queryParams)){rs =>
			DownloadsPerTimeframe(rs.getInt("count"), rs.getDate("day").toLocalDate.atStartOfDay(ZoneOffset.UTC).toInstant)
		}

	def downloadsPerYear(queryParams: StatsQueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadsPerTimeframe]] =
		runAnalyticalQuery("SELECT count, day FROM downloadsPerYear", Some(queryParams)){rs =>
			DownloadsPerTimeframe(rs.getInt("count"), rs.getDate("day").toLocalDate.atStartOfDay(ZoneOffset.UTC).toInstant)
		}

	def downloadStats(queryParams: StatsQueryParams)(implicit envri: Envri): Future[DownloadStats] = {
		val objStatsFut = runAnalyticalQuery("SELECT count, hash_id FROM downloadStats", Some(queryParams)){rs =>
			DownloadObjStat(rs.getInt("count"), rs.getString("hash_id"))
		}
		val sizeFut = runAnalyticalQuery("SELECT size FROM downloadStatsSize", Some(queryParams)){
			rs => rs.getInt("size")
		}.map(_.head)

		objStatsFut.zip(sizeFut).map{
			case (stats, size) => DownloadStats(stats, size)
		}
	}

	def specifications(implicit envri: Envri): Future[IndexedSeq[Specifications]] = {
		runAnalyticalQuery("SELECT count, spec FROM specifications()"){rs =>
			Specifications(rs.getInt("count"), rs.getString("spec"))
		}
	}

	def contributors(implicit envri: Envri): Future[IndexedSeq[Contributors]] =
		runAnalyticalQuery("SELECT count, contributor FROM contributors()"){rs =>
			Contributors(rs.getInt("count"), rs.getString("contributor"))
		}
	
	def submitters(implicit envri: Envri): Future[IndexedSeq[Submitters]] =
		runAnalyticalQuery("SELECT count, submitter FROM submitters()"){rs =>
			Submitters(rs.getInt("count"), rs.getString("submitter"))
		}

	def stations(implicit envri: Envri): Future[IndexedSeq[Stations]] =
		runAnalyticalQuery("SELECT count, station FROM stations()"){rs =>
			Stations(rs.getInt("count"), rs.getString("station"))
		}

	def dlfrom(implicit envri: Envri): Future[IndexedSeq[DownloadedFrom]] =
		runAnalyticalQuery("SELECT count, country_code FROM dlfrom()"){rs =>
			DownloadedFrom(rs.getInt("count"), rs.getString("country_code"))
		}

	def downloadCount(hashId: Sha256Sum)(implicit envri: Envri): Future[IndexedSeq[DownloadCount]] =
		runAnalyticalQuery(s"SELECT COUNT(*) AS download_count FROM downloads WHERE hash_id = '${hashId}'"){rs =>
			DownloadCount(rs.getInt("download_count"))
	}

	def lastDownloads(limit: Int, itemType: Option[DlItemType.Value])(implicit envri: Envri): Future[IndexedSeq[Download]] = {
		val whereClause = itemType.fold("")(value => s"WHERE item_type = '$value'")
		// Limit coordinates to 5 decimals in function ST_AsGeoJSON
		val query = s"""
			|SELECT
			|	item_type, ts, hash_id, ip, city, country_code, ST_AsGeoJSON(pos, 5) AS geojson
			|FROM downloads
			|${whereClause}
			|ORDER BY id DESC
			|LIMIT ${limit}
			|""".stripMargin

		runAnalyticalQuery(query){rs =>
			Download(
				rs.getString("item_type"),
				rs.getTimestamp("ts").toLocalDateTime.toInstant(ZoneOffset.UTC),
				rs.getString("hash_id"),
				rs.getString("ip"),
				Option(rs.getString("city")),
				Option(rs.getString("country_code")),
				Option(rs.getString("geojson")).flatMap(parsePointPosition)
			)
		}
	}

	def runAnalyticalQuery[T](
		queryStr: String, params: Option[StatsQueryParams] = None
	)(parser: ResultSet => T)(implicit envri: Envri): Future[IndexedSeq[T]] =
		withConnection(conf.reader){conn =>
			val functionParams = "(_page:=?, _pagesize:=?, _specs:=?, _stations:=?, _submitters:=?, _contributors:=?, _downloaded_from:=?, _origin_stations:=?)"
			val fullQueryString = if(params.isEmpty) queryStr else queryStr + functionParams

			val preparedSt = conn.prepareStatement(fullQueryString)

			def initArray(idx: Int, arr: Option[Seq[String]]): Unit = arr match {
				case Some(values) => preparedSt.setArray(idx, conn.createArrayOf("varchar", values.toArray))
				case None => preparedSt.setNull(idx, Types.ARRAY)
			}

			params.foreach{qp =>
				preparedSt.setInt(1, qp.page)
				preparedSt.setInt(2, qp.pagesize)
				initArray(        3, qp.specs)
				initArray(        4, qp.stations)
				initArray(        5, qp.submitters)
				initArray(        6, qp.contributors)
				initArray(        7, qp.dlfrom)
				initArray(        8, qp.originStations)
			}

			consumeResultSet(preparedSt.executeQuery())(parser)
		}

	def consumeResultSet[T](resultSet: ResultSet)(fn: ResultSet => T): IndexedSeq[T] = {
		val res = scala.collection.mutable.Buffer.empty[T]
		while(resultSet.next()){
			res += fn(resultSet)
		}
		resultSet.close()
		res.toIndexedSeq
	}

	private def updateMatView(matView: String)(implicit envri: Envri): Unit =
		withConnectionEager(conf.admin){conn =>
			// Disable transactions
			conn.setAutoCommit(true)
			val st = conn.createStatement
			try{
				st.execute(s"REFRESH MATERIALIZED VIEW CONCURRENTLY $matView ;")
				st.execute(s"VACUUM (ANALYZE) $matView ;")
			}finally{
				st.close()
			}
		}.failed.foreach{
			err => log.error(err, s"Failed to update materialized view $matView for $envri (periodic background task)")
		}

	private def withConnection[T](creds: CredentialsConfig)(act: Connection => T)(implicit envri: Envri): Future[T] = Future{
		Future.fromTry(withConnectionEager(creds)(act))
	}.flatten

	private def withConnectionEager[T](creds: CredentialsConfig)(act: Connection => T)(implicit envri: Envri): Try[T] = Try{
		val conn = dataSources(envri).getConnection(creds.username, creds.password)
		try {
			conn.setHoldability(ResultSet.CLOSE_CURSORS_AT_COMMIT)
			act(conn)
		} finally{
			conn.close()
		}
	}

	private def execute(credentials: CredentialsConfig)(action: Connection => Unit)(implicit envri: Envri): Future[Done] = {
		withConnection(credentials){conn =>
			try {
				action(conn)
				conn.commit()
				Done
			} catch {
				case ex: Throwable =>
					conn.rollback()
					throw ex
			}
		}
	}

}
