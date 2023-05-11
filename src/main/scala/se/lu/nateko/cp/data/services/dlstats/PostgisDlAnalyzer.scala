package se.lu.nateko.cp.data.services.dlstats

import eu.icoscp.envri.Envri
import se.lu.nateko.cp.data.PostgisConfig
import se.lu.nateko.cp.data.api.PostgisClient
import se.lu.nateko.cp.data.routes.StatsRouting.*
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import java.sql.Date
import java.sql.ResultSet
import java.sql.Types
import java.time.ZoneOffset
import scala.concurrent.Future

class PostgisDlAnalyzer(conf: PostgisConfig) extends PostgisClient(conf):

	def downloadsByCountry(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsByCountry]] =
		runAnalyticalQuery("SELECT count, country_code FROM downloadsByCountry", Some(queryParams)){rs =>
			DownloadsByCountry(rs.getInt("count"), rs.getString("country_code"))
		}

	def downloadsPerWeek(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerWeek]] =
		runAnalyticalQuery("SELECT count, day, week FROM downloadsperweek", Some(queryParams)){rs =>
			DownloadsPerWeek(rs.getInt("count"), rs.getDate("day").toLocalDate.atStartOfDay(ZoneOffset.UTC).toInstant, rs.getDouble("week"))
		}

	def downloadsPerMonth(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerTimeframe]] =
		runAnalyticalQuery("SELECT count, day FROM downloadsPerMonth", Some(queryParams)){rs =>
			DownloadsPerTimeframe(rs.getInt("count"), rs.getDate("day").toLocalDate.atStartOfDay(ZoneOffset.UTC).toInstant)
		}

	def downloadsPerYear(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[DownloadsPerTimeframe]] =
		runAnalyticalQuery("SELECT count, day FROM downloadsPerYear", Some(queryParams)){rs =>
			DownloadsPerTimeframe(rs.getInt("count"), rs.getDate("day").toLocalDate.atStartOfDay(ZoneOffset.UTC).toInstant)
		}

	def downloadStats(queryParams: StatsQueryParams)(using Envri): Future[DownloadStats] =
		val objStatsFut = runAnalyticalQuery("SELECT count, hash_id FROM downloadStats", Some(queryParams)){rs =>
			DownloadObjStat(rs.getInt("count"), rs.getString("hash_id"))
		}
		val sizeFut = runAnalyticalQuery("SELECT size FROM downloadStatsSize", Some(queryParams)){
			rs => rs.getInt("size")
		}.map(_.head)

		objStatsFut.zip(sizeFut).map{
			case (stats, size) => DownloadStats(stats, size)
		}

	def specifications(using Envri): Future[IndexedSeq[Specifications]] =
		runAnalyticalQuery("SELECT count, spec FROM specifications()"){rs =>
			Specifications(rs.getInt("count"), rs.getString("spec"))
		}

	def contributors(using Envri): Future[IndexedSeq[Contributors]] =
		runAnalyticalQuery("SELECT count, contributor FROM contributors()"){rs =>
			Contributors(rs.getInt("count"), rs.getString("contributor"))
		}

	def submitters(using Envri): Future[IndexedSeq[Submitters]] =
		runAnalyticalQuery("SELECT count, submitter FROM submitters()"){rs =>
			Submitters(rs.getInt("count"), rs.getString("submitter"))
		}

	def stations(using Envri): Future[IndexedSeq[Stations]] =
		runAnalyticalQuery("SELECT count, station FROM stations()"){rs =>
			Stations(rs.getInt("count"), rs.getString("station"))
		}

	def dlfrom(using Envri): Future[IndexedSeq[DownloadedFrom]] =
		runAnalyticalQuery("SELECT count, country_code FROM dlfrom()"){rs =>
			DownloadedFrom(rs.getInt("count"), rs.getString("country_code"))
		}

	def downloadedCollections(using Envri): Future[IndexedSeq[DateCount]] =
		runAnalyticalQuery("SELECT month_start, count FROM downloadedCollections()"){rs =>
			DateCount(rs.getString("month_start"), rs.getInt("count"))
		}

	def downloadCount(hashId: Sha256Sum)(using Envri): Future[IndexedSeq[DownloadCount]] =
		runAnalyticalQuery(s"""
				|SELECT COUNT(*) AS download_count
				|FROM downloads
				|WHERE hash_id = '${hashId.id}' AND (distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist)))
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

	def customDownloadsPerYearCountry(queryParams: StatsQueryParams)(using Envri): Future[IndexedSeq[CustomDownloadsPerYearCountry]] =
		runAnalyticalQuery("SELECT year, country, downloads FROM customDownloadsPerYearCountry", Some(queryParams)){rs =>
			CustomDownloadsPerYearCountry(rs.getInt("year"), rs.getString("country"), rs.getInt("downloads"))
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
				initArray(        	3, qp.specs)
				initArray(        	4, qp.stations)
				initArray(        	5, qp.submitters)
				initArray(        	6, qp.contributors)
				initArray(        	7, qp.dlfrom)
				initArray(        	8, qp.originStations)
				initString(        	9, qp.hashId)
				initDate(        	10, qp.dlStart)
				initDate(        	11, qp.dlEnd)
			}

			consumeResultSet(preparedSt.executeQuery())(parser)
		}

	def consumeResultSet[T](resultSet: ResultSet)(fn: ResultSet => T): IndexedSeq[T] =
		val res = scala.collection.mutable.Buffer.empty[T]
		while(resultSet.next()){
			res += fn(resultSet)
		}
		resultSet.close()
		res.toIndexedSeq

end PostgisDlAnalyzer
