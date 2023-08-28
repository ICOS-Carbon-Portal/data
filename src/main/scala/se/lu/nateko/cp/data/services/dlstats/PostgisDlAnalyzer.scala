package se.lu.nateko.cp.data.services.dlstats

import eu.icoscp.envri.Envri
import se.lu.nateko.cp.data.PostgisConfig
import se.lu.nateko.cp.data.api.PostgisClient
import se.lu.nateko.cp.data.routes.StatsRouting.*
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.CountryCode
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.data.utils.contextualizeFailure
import se.lu.nateko.cp.data.utils.eager

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
import spray.json.*
import DefaultJsonProtocol.*
import akka.protobufv3.internal.Timestamp
import java.time.{LocalDate, ZoneId}
import java.time.Instant
import scala.collection.mutable.ArrayBuffer
import se.lu.nateko.cp.data.api.IpTest

class PostgisDlAnalyzer(conf: PostgisConfig, log: LoggingAdapter) extends PostgisClient(conf):

	val initLogTables = if conf.skipInit then done else
		val psqlScript = Source.fromResource("sql/logging/initLogTables.sql").mkString
		val futs = conf.dbNames.keys.map{implicit envri =>
			withConnection(conf.admin)(conn =>
				conn.setAutoCommit(true)
				val st = conn.createStatement()
				st.execute(psqlScript)
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
				_ = log.info(s"Found $size 'white' and 'gray' downloads for $envri")
				index <- initIndex(size)
					.contextualizeFailure(s"initializing StatsIndex with size hint $size")
			yield index
		envri -> indexFut

	def statsIndex(using envri: Envri): Future[StatsIndex] =
		statsIndices.getOrElse(envri, Future.failed(new CpDataException(s"Postgis Analyzer was not configured for ENVRI $envri")))
			.eager(s"Statindex for $envri is not ready yet. Try again in a minute.")

	def runQuery[T](qp: StatsQueryParams)(runner: (StatsIndex, StatsQuery) => T)(using Envri): Future[T] =
		for
			index <- statsIndex
			eventIds <- qp.hashId match
				case Some(hashId) =>
					val query = s"SELECT id FROM statIndexEntries WHERE hash_id='${hashId.id}';"
					runAnalyticalQuery(query)(rs => rs.getInt("id")).map(resQuery => Some(resQuery.toArray))
				case None => Future.successful(None)
			query = StatsQuery(
				page = qp.page,
				pageSize = qp.pagesize,
				dlEventIds = eventIds,
				contributors = qp.contributors,
				specs = qp.specs,
				stations = qp.stations,
				submitters = qp.submitters,
				dlfrom = qp.dlfrom,
				originStations = qp.originStations,
				dlStart = qp.dlStart,
				dlEnd = qp.dlEnd,
				includeGrayDl = qp.includeGrayDl
			)
		yield runner(index, query)

	def downloadsByCountry(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsByCountry]] =
		runQuery(queryParams)(_ downloadsByCountry _)

	def customDownloadsPerYearCountry(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[CustomDownloadsPerYearCountry]] =
		runQuery(queryParams)(_ downloadsPerYearByCountry _)

	def downloadsPerWeek(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerWeek]] =
		runQuery(queryParams)(_ downloadsPerWeek _)

	def downloadsPerMonth(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerTimeframe]] =
		runQuery(queryParams)(_ downloadsPerMonth _)

	def downloadsPerYear(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerTimeframe]] =
		runQuery(queryParams)(_ downloadsPerYear _)

	def downloadStats(queryParams: StatsQueryParams)(using Envri): Future[DownloadStats] =
		runQuery(queryParams)(_ downloadStats _)

	def specifications(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[Specifications]] =
		runQuery(queryParams)(_ specifications _)

	def contributors(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[Contributors]] =
		runQuery(queryParams)(_ contributors _)

	def submitters(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[Submitters]] =
		runQuery(queryParams)(_ submitters _)

	def stations(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[Stations]] =
		runQuery(queryParams)(_ stations _)

	def dlfrom(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadedFrom]] =
		runQuery(queryParams)(_ dlfrom _)
	
	def downloadedCollections(using Envri): Future[IndexedSeq[DateCount]] =
		runAnalyticalQuery("SELECT month_start, count FROM downloadedCollections()"){rs =>
			DateCount(rs.getString("month_start"), rs.getInt("count"))
		}

	def downloadCount(hashId: Sha256Sum)(using Envri): Future[IndexedSeq[DownloadCount]] =
		runAnalyticalQuery(s"""
				|SELECT COUNT(*) AS download_count
				|FROM downloads
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
				initArray(        	3, qp.specs.map(s => s.map(_.toString)))
				initArray(        	4, qp.stations.map(s => s.map(_.toString)))
				initArray(        	5, qp.submitters.map(s => s.map(_.toString)))
				initArray(        	6, qp.contributors.map(s => s.map(_.toString)))
				initArray(        	7, qp.dlfrom.map(s => s.map(_.toString)))
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

	def initIndex(currentSize: Int)(using envri: Envri): Future[StatsIndex] =
		val futTry = withConnection(conf.reader): conn =>
			val indexImportQuery = "SELECT * FROM statIndexEntries"
			Using(conn.prepareStatement(indexImportQuery)): preparedSt =>
				log.info(s"Will execute query to start streaming stats index entries for $envri...")
				preparedSt.setFetchSize(10000)
				val resSet = preparedSt.executeQuery()
				log.info(s"Stats index entries query for $envri executed, starting ingestion...")
				val index = StatsIndex((currentSize * 1.05 + 100).toInt)
				var nIngested: Long = 0
				while resSet.next() do
					val indexEntry = parseIndexEntry(resSet).get
					index.add(indexEntry)
					nIngested += 1
					if nIngested % 100000 == 0 then
						log.info(s"Ingested $nIngested StatsIndex entries")
				index.runOptimize()
				index
		futTry.flatMap(Future.fromTry)

	def parseIndexEntry(rs: ResultSet): Try[StatsIndexEntry] =
		Sha256Sum.fromBase64Url(rs.getString("hash_id")).map: dobj =>
			val ccodeStr = rs.getString("country_code")
			val contribsArray = Option(rs.getArray("contributors")).fold(Array.empty[String])(_.getArray().asInstanceOf[Array[String]])
			StatsIndexEntry(
				idx = rs.getInt("id"),
				dobj = dobj,
				dlTime = rs.getTimestamp("ts").toInstant(),
				objectSpec = new URI(rs.getString("spec")),
				station = Option(rs.getString("station")).map(new URI(_)),
				submitter = new URI(rs.getString("submitter")),
				contributors = contribsArray.map(new URI(_)).toIndexedSeq,
				dlCountry = Option(ccodeStr).flatMap(CountryCode.unapply),
				isGrayDownload =
					val ip = rs.getString("ip")
					conf.grayDownloads.exists(_.test(ip))
			)
end PostgisDlAnalyzer
