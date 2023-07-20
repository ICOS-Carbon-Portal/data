package se.lu.nateko.cp.data.services.dlstats

import eu.icoscp.envri.Envri
import se.lu.nateko.cp.data.PostgisConfig
import se.lu.nateko.cp.data.api.PostgisClient
import se.lu.nateko.cp.data.routes.StatsRouting.*
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.CountryCode
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.data.utils.contextualizeFailure

import java.sql.Date
import java.sql.ResultSet
import java.sql.Types
import java.time.ZoneOffset
import scala.concurrent.Future
import org.apache.commons.dbcp2.datasources.SharedPoolDataSource
import org.postgresql.ds.PGConnectionPoolDataSource
import se.lu.nateko.cp.data.api.CpDataException
import scala.util.Using
import scala.util.Try
import akka.Done
import java.net.URI
import akka.event.LoggingAdapter
import scala.io.Source
import scala.concurrent.ExecutionContext

class PostgisDlAnalyzer(conf: PostgisConfig, log: LoggingAdapter) extends PostgisClient(conf):

	val initLogTables = if conf.skipInit then done else
		val psqlScript = Source.fromResource("sql/logging/initLogTables.sql").mkString
		val futs = conf.dbNames.keys.map{implicit envri =>
			withConnection(conf.admin)(conn =>
				conn.setAutoCommit(true)
				val st = conn.createStatement()
				psqlScript.split("--BREAK").foreach: command =>
					try
						st.execute(command)
						//log.info(s"Executed PSQL command:$command")
					catch case err: Throwable => throw CpDataException(
						s"Database error: ${err.getMessage} while executing command:$command"
					)
				st.close()
			)
		}.toIndexedSeq
		Future.sequence(futs).map{_ => Done}

	val statsIndices: Map[Envri, Future[StatsIndex]] = conf.dbNames.map: (envri, _) =>
		given Envri = envri
		val query = "SELECT COUNT(*) AS count FROM downloads"
		val indexFut =
			for
				_ <- initLogTables
					.contextualizeFailure(s"initializing postgis db for ENVRI $envri")
				counts <- runAnalyticalQuery(query)(_.getInt("count"))
					.contextualizeFailure("getting the size of 'downloads' table")
				size = counts.head
				index <- initIndex(size)
					.contextualizeFailure(s"initializing StatsIndex with size hint $size")
			yield index
		envri -> indexFut

	def statsIndex(using envri: Envri): Future[StatsIndex] =
		statsIndices.getOrElse(envri, Future.failed(new CpDataException(s"Postgis Analyzer was not configured for ENVRI $envri")))

	def downloadsByCountry(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsByCountry]] =
		statsIndex.map(_.downloadsByCountry(queryParams))

	def customDownloadsPerYearCountry(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[CustomDownloadsPerYearCountry]] =
		statsIndex.map(_.downloadsByYearCountry(queryParams))

	def downloadsPerWeek(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerWeek]] =
		statsIndex.map(_.downloadsPerWeek(queryParams))

	def downloadsPerMonth(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerMonth]] =
		statsIndex.map(_.downloadsPerMonth(queryParams))

	def downloadsPerYear(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerYear]] =
		statsIndex.map(_.downloadsPerYear(queryParams))

	def downloadStats(queryParams: StatsQueryParams)(using Envri): Future[DownloadStats] =
		statsIndex.map(_.downloadStats(queryParams))

	def specifications(using Envri): Future[IndexedSeq[Specifications]] =
		statsIndex.map(_.specifications())

	def contributors(using Envri): Future[IndexedSeq[Contributors]] =
		statsIndex.map(_.contributors())

	def submitters(using Envri): Future[IndexedSeq[Submitters]] =
		statsIndex.map(_.submitters())

	def stations(using Envri): Future[IndexedSeq[Stations]] =
		statsIndex.map(_.stations())

	def dlfrom(using Envri): Future[IndexedSeq[DownloadedFrom]] =
		statsIndex.map(_.dlfrom())

	def downloadedCollections(using Envri): Future[IndexedSeq[DateCount]] =
		runAnalyticalQuery("SELECT month_start, count FROM downloadedCollections()"){rs =>
			DateCount(rs.getString("month_start"), rs.getInt("count"))
		}

	def downloadCount(hashId: Sha256Sum)(using Envri): Future[IndexedSeq[DownloadCount]] =
		runAnalyticalQuery(s"""
				|SELECT COUNT(*) AS download_count
				|FROM white_downloads
				|WHERE hash_id = '${hashId.id}'
				|""".stripMargin){rs =>
			DownloadCount(rs.getInt("download_count"))
		}

	def lastDownloads(limit: Int, itemType: Option[DlItemType])(using Envri): Future[IndexedSeq[Download]] =
		val whereClause = itemType.fold("")(value => s"WHERE item_type = '$value'")
		// Limit coordinates to 5 decimals in function ST_AsGeoJSON
		val query = s"""
			|SELECT
			|	item_type, ts, hash_id, ip, city, country_code, endUser, ST_AsGeoJSON(pos, 5) AS geojson
			|FROM downloads
			|${whereClause}
			|ORDER BY id DESC
			|LIMIT ${limit}
			|""".stripMargin

		runAnalyticalQuery(query){rs =>
			Download(
				itemType = rs.getString("item_type"),
				ts = rs.getTimestamp("ts").toInstant(),
				hashId = rs.getString("hash_id"),
				ip = rs.getString("ip"),
				city = Option(rs.getString("city")),
				countryCode = Option(rs.getString("country_code")),
				endUser = Option(rs.getString("endUser")),
				geoJson = Option(rs.getString("geojson")).flatMap(parsePointPosition)
			)
		}

	def runAnalyticalQuery[T](
		queryStr: String, params: Option[StatsQueryParams] = None
	)(parser: ResultSet => T)(using Envri): Future[IndexedSeq[T]] =
		withConnection(conf.reader){conn =>
			val functionParams = """
				|(_page:=?
				|, _pagesize:=?
				|, _specs:=?
				|, _stations:=?
				|, _submitters:=?
				|, _contributors:=?
				|, _downloaded_from:=?
				|, _origin_stations:=?
				|, _hash_id:=?
				|, _date_from:=?
				|, _date_to:=?)""".stripMargin
			val fullQueryString = if(params.isEmpty) queryStr else queryStr + functionParams

			val preparedSt = conn.prepareStatement(fullQueryString)

			def initArray(idx: Int, arr: Option[Seq[String]]): Unit = arr match
				case Some(values) => preparedSt.setArray(idx, conn.createArrayOf("varchar", values.toArray))
				case None => preparedSt.setNull(idx, Types.ARRAY)

			def initString(idx: Int, str: Option[String]): Unit = str match
				case Some(value) => preparedSt.setString(idx, value)
				case None => preparedSt.setNull(idx, Types.VARCHAR)

			def initDate(idx: Int, str: Option[String]): Unit = str match
				case Some(value) => preparedSt.setDate(idx, Date.valueOf(value))
				case None => preparedSt.setNull(idx, Types.DATE)

			params.foreach{qp =>
				preparedSt.setInt(	1, qp.page)
				preparedSt.setInt(	2, qp.pagesize)
				initArray(        	3, qp.objectSpecs.map(s => s.map(_.toString)))
				initArray(        	4, qp.stations.map(s => s.map(_.toString)))
				initArray(        	5, qp.submitters.map(s => s.map(_.toString)))
				initArray(        	6, qp.contributors.map(s => s.map(_.toString)))
				initArray(        	7, qp.dlCountries.map(s => s.map(_.toString)))
				initArray(        	8, qp.originStations.map(s => s.map(_.toString)))
				initString(        	9, qp.hashId.map(_.toString))
				initDate(        	10, qp.dlStart.map(_.toString))
				initDate(        	11, qp.dlEnd.map(_.toString))
			}

			val res = consumeResultSet(preparedSt.executeQuery())(parser)
			preparedSt.close()
			res
		}

	def consumeResultSet[T](resultSet: ResultSet)(fn: ResultSet => T): IndexedSeq[T] =
		val res = scala.collection.mutable.Buffer.empty[T]
		while(resultSet.next()){
			res += fn(resultSet)
		}
		resultSet.close()
		res.toIndexedSeq

	def initIndex(currentSize: Int)(using Envri): Future[StatsIndex] =
		import PostgisDlAnalyzer.*
		val futTry = withConnection(conf.reader): conn =>
			Using(conn.prepareStatement(indexImportQuery)): preparedSt =>
				val resSet = preparedSt.executeQuery()
				val index = StatsIndex((currentSize * 1.05 + 100).toInt)
				var nIngested: Long = 0
				while resSet.next() do
					index.add(parseIndexEntry(resSet).get)
					nIngested += 1
					if nIngested % 100 == 0 then log.info(s"Ingested $nIngested StatsIndex entries")
				index.runOptimize()
				index
		futTry.flatMap(Future.fromTry)


end PostgisDlAnalyzer

object PostgisDlAnalyzer:
	val indexImportQuery = "SELECT * FROM statIndexEntries;"

	def parseIndexEntry(rs: ResultSet): Try[StatsIndexEntry] =
		Sha256Sum.fromBase64Url(rs.getString("hash_id")).map: dobj =>
			val ccodeStr = rs.getString("country_code");
			//TODO Uncomment the next-line code and make it work
			val contribsArray = Array.empty[Object]//Option(rs.getArray("contributors")).fold(Array.emptyObjectArray)(_.getArray().asInstanceOf[Array[Object]])
			StatsIndexEntry(
				idx = rs.getInt("id"),
				dobj = dobj,
				dlTime = rs.getTimestamp("ts").toInstant(),
				objectSpec = new URI(rs.getString("spec")),
				station = Option(rs.getString("station")).map(new URI(_)),
				submitter = new URI(rs.getString("submitter")),
				contributors = contribsArray.map(o => new URI(o.toString)).toIndexedSeq,
				dlCountry = Option(ccodeStr).flatMap(CountryCode.unapply)
			)
