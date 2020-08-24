package se.lu.nateko.cp.data.services.dlstats

import java.sql.Connection
import java.sql.DriverManager
import se.lu.nateko.cp.data.DownloadStatsConfig
import se.lu.nateko.cp.data.CredentialsConfig
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import java.sql.ResultSet
import java.sql.Statement
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.L2OrLessSpecificMeta
import se.lu.nateko.cp.meta.core.data.L3SpecificMeta
import java.sql.PreparedStatement
import scala.concurrent.Future
import akka.Done
import scala.util.Try
import scala.util.Success
import scala.util.Failure
import java.nio.file.Files
import java.nio.file.Paths
import scala.io.Source
import scala.concurrent.ExecutionContext
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.ArrayBlockingQueue
import org.postgresql.ds.PGConnectionPoolDataSource
import org.apache.commons.dbcp2.datasources.SharedPoolDataSource
import java.sql.Types
import se.lu.nateko.cp.data.routes.StatsQueryParams
import se.lu.nateko.cp.data.routes.DownloadsByCountry
import se.lu.nateko.cp.data.routes.DownloadsPerWeek
import se.lu.nateko.cp.data.routes.DownloadsPerTimeframe


class PostgresDlLog(conf: DownloadStatsConfig) extends AutoCloseable{

	private[this] val executor = {
		val maxThreads = conf.dbAccessPoolSize * conf.dbNames.size
		new ThreadPoolExecutor(
			1, maxThreads, 30, TimeUnit.SECONDS, new ArrayBlockingQueue[Runnable](maxThreads)
		)
	}

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
		dataSources.valuesIterator.foreach{_.close()}
	}

	def initLogTables(): Future[Done] = {
		val query = Source.fromResource("sql/logging/initLogTables.sql").mkString

		val futs = conf.dbNames.keys.map{implicit envri =>
			withConnection(conf.admin)(conn => {
				conn.createStatement().execute(query)
				conn.commit()
			})
		}.toIndexedSeq
		Future.sequence(futs).map(_ => Done)
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

				val contribs = dobj.specificInfo.fold(
					_.productionInfo.contributors,
					_.productionInfo.toSeq.flatMap(_.contributors)
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

	def downloadsByCountry(queryParams: StatsQueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadsByCountry]] = {
		query(conf.writer)(conn => {
			val queryStr = "SELECT count, country_code FROM downloadsByCountry(_specs := ?, _stations:= ?, _submitters := ?, _contributors := ?)"
			val preparedSt = getPreparedStatement(conn, queryParams, queryStr)

			consumeResultSet(preparedSt.executeQuery()){rs => 
				DownloadsByCountry(rs.getInt("count"), rs.getString("country_code"))
			}
		})
	}

	def downloadsPerWeek(queryParams: StatsQueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadsPerWeek]] = {
		query(conf.writer)(conn => {
			val queryStr = "SELECT count, ts, week FROM downloadsperweek(_specs := ?, _stations:= ?, _submitters := ?, _contributors := ?)"
			val preparedSt = getPreparedStatement(conn, queryParams, queryStr)

			consumeResultSet(preparedSt.executeQuery()){rs => 
				DownloadsPerWeek(rs.getInt("count"), rs.getTimestamp("ts").toInstant, rs.getDouble("week"))
			}
		})
	}

	def downloadsPerMonth(queryParams: StatsQueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadsPerTimeframe]] = {
		query(conf.writer)(conn => {
			val queryStr = "SELECT count, ts FROM downloadsPerMonth(_specs := ?, _stations:= ?, _submitters := ?, _contributors := ?)"
			val preparedSt = getPreparedStatement(conn, queryParams, queryStr)

			consumeResultSet(preparedSt.executeQuery()){rs => 
				DownloadsPerTimeframe(rs.getInt("count"), rs.getTimestamp("ts").toInstant)
			}
		})
	}

	def downloadsPerYear(queryParams: StatsQueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadsPerTimeframe]] = {
		query(conf.writer)(conn => {
			val queryStr = "SELECT count, ts FROM downloadsPerYear(_specs := ?, _stations:= ?, _submitters := ?, _contributors := ?)"
			val preparedSt = getPreparedStatement(conn, queryParams, queryStr)

			consumeResultSet(preparedSt.executeQuery()){rs => 
				DownloadsPerTimeframe(rs.getInt("count"), rs.getTimestamp("ts").toInstant)
			}
		})
	}

	def getPreparedStatement(conn: Connection, queryParams: StatsQueryParams, queryStr: String): PreparedStatement = {
		val preparedSt = conn.prepareStatement(queryStr)

		import queryParams._
		Seq(specs, stations, submitters, contributors)
			.zipWithIndex
			.foreach{
				case (None, idx) =>
					preparedSt.setNull(idx + 1, Types.ARRAY)
				case (Some(values), idx) =>
					preparedSt.setArray(idx + 1, conn.createArrayOf("varchar", values.toArray))
			}
			
		preparedSt
	}

	def consumeResultSet[T](resultSet: ResultSet)(fn: ResultSet => T): IndexedSeq[T] = {
		val res = scala.collection.mutable.Buffer.empty[T]
		while(resultSet.next()){
			res += fn(resultSet)
		}
		resultSet.close()
		res.toIndexedSeq
	}

	private def withConnection[T](creds: CredentialsConfig)(act: Connection => T)(implicit envri: Envri): Future[T] = Future{
		val conn = dataSources(envri).getConnection(creds.username, creds.password)
		conn.setHoldability(ResultSet.CLOSE_CURSORS_AT_COMMIT)
		try {
			act(conn)
		} finally{
			conn.close()
		}
	}

	private def query[T](credentials: CredentialsConfig)(action: Connection => IndexedSeq[T])(implicit envri: Envri): Future[IndexedSeq[T]] = {
		withConnection(credentials){conn =>
			action(conn)
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
