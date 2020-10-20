package se.lu.nateko.cp.data.routes

import se.lu.nateko.cp.data.ConfigReader
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Directive1
import se.lu.nateko.cp.data.services.dlstats.PostgresDlLog
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import spray.json.DefaultJsonProtocol
import spray.json._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import se.lu.nateko.cp.data.CpdataJsonProtocol.javaTimeInstantFormat
import java.time.Instant
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.marshalling.ToResponseMarshallable
import scala.concurrent.Future
import scala.util.Try
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.data.services.dlstats.DlItemType

object StatsRouting extends DefaultJsonProtocol{
	case class StatsQueryParams(
		page: Int,
		pagesize: Int,
		specs: Option[Seq[String]],
		stations: Option[Seq[String]],
		submitters: Option[Seq[String]],
		contributors: Option[Seq[String]],
		dlfrom: Option[Seq[String]],
		originStations: Option[Seq[String]],
	)
	case class DownloadsByCountry(count: Int, countryCode: String)
	case class DownloadsPerWeek(count: Int, ts: Instant, week: Double)
	case class DownloadsPerTimeframe(count: Int, ts: Instant)
	case class DownloadObjStat(count: Int, hashId: String)
	case class DownloadStats(stats: IndexedSeq[DownloadObjStat], size: Int)
	case class Specifications(count: Int, spec: String)
	case class Contributors(count: Int, contributor: String)
	case class Submitters(count: Int, submitter: String)
	case class Stations(count: Int, station: String)
	case class DownloadedFrom(count: Int, countryCode: String)
	case class DownloadCount(downloadCount: Int)
	case class PointPosition(`type`: String, coordinates: Tuple2[Double, Double])
	case class Download(itemType: String, ts: Instant, hashId: String, ip: String, city: Option[String], countryCode: Option[String], geoJson: Option[PointPosition])

	implicit val pointPositionFormat = jsonFormat2(PointPosition)
	implicit val downloadsByCountryFormat = jsonFormat2(DownloadsByCountry)
	implicit val downloadsPerWeekFormat = jsonFormat3(DownloadsPerWeek)
	implicit val downloadsPerTimeframeFormat = jsonFormat2(DownloadsPerTimeframe)
	implicit val downloadObjStatFormat = jsonFormat2(DownloadObjStat)
	implicit val downloadStatsFormat = jsonFormat2(DownloadStats)
	implicit val specificationsFormat = jsonFormat2(Specifications)
	implicit val contributorsFormat = jsonFormat2(Contributors)
	implicit val submittersFormat = jsonFormat2(Submitters)
	implicit val stationsFormat = jsonFormat2(Stations)
	implicit val downloadedFromFormat = jsonFormat2(DownloadedFrom)
	implicit val downloadCountFormat = jsonFormat1(DownloadCount)
	implicit val downloadFormat = jsonFormat7(Download)

	def parsePointPosition(jsonStr: String): Option[PointPosition] =
		Try{jsonStr.parseJson.convertTo[PointPosition]}.toOption
}

class StatsRouting(pgClient: PostgresDlLog, coreConf: MetaCoreConfig) {
	import StatsRouting._
	
	implicit val envriConfs = coreConf.envriConfigs
	val extractEnvri = UploadRouting.extractEnvriDirective

	def statsQuery[T](lastSegm: String, fetcher: StatsQueryParams => Future[T])(implicit conv: T => ToResponseMarshallable): Route = path(lastSegm){
		parameters(
			"page".as[Int].?,
			"pagesize".as[Int].?,
			"specs".as[List[String]].?,
			"stations".as[List[String]].?,
			"submitters".as[List[String]].?,
			"contributors".as[List[String]].?,
			"dlfrom".as[List[String]].?,
			"originStations".as[List[String]].?,
		){(page, pagesize, specs, stations, submitters, contributors, dlfrom, originStations) =>
			//The constants in the next line can be moved to a config, if needed
			val pageSize = Math.min(100000, pagesize.getOrElse(100))
			val qp = StatsQueryParams(page.getOrElse(1), pageSize, specs, stations, submitters, contributors, dlfrom, originStations)
			onSuccess(fetcher(qp)){res =>
				complete(res)
			}
		}
	}

	val route: Route = (get & pathPrefix("stats" / "api") & extractEnvri){ implicit envri =>

		statsQuery("downloadsByCountry", pgClient.downloadsByCountry) ~
		statsQuery("downloadsPerWeek", pgClient.downloadsPerWeek) ~
		statsQuery("downloadsPerMonth", pgClient.downloadsPerMonth) ~
		statsQuery("downloadsPerYear", pgClient.downloadsPerYear) ~
		statsQuery("downloadStats", pgClient.downloadStats) ~
		path("specifications"){
			onSuccess(pgClient.specifications){dbc =>
				complete(dbc)
			}
		} ~
		path("contributors"){
			onSuccess(pgClient.contributors){dbc =>
				complete(dbc)
			}
		} ~
		path("submitters"){
			onSuccess(pgClient.submitters){dbc =>
				complete(dbc)
			}
		} ~
		path("stations"){
			onSuccess(pgClient.stations){dbc =>
				complete(dbc)
			}
		} ~
		path("dlfrom"){
			onSuccess(pgClient.dlfrom){dbc =>
				complete(dbc)
			}
		} ~
		path("downloadCount"){
			parameter("hashId") {hash =>
				val hashId = Sha256Sum.fromString(hash).get

				onSuccess(pgClient.downloadCount(hashId)){dbc =>
					complete(dbc)
				}
			}
		} ~
		path("lastDownloads"){
			parameters("limit".as[Int].?, "itemType".as[String].?) {(limitParam, itemTypeParam) =>
				val limit = Math.min(limitParam.getOrElse(1000), 100000)
				val itemType = itemTypeParam.flatMap(DlItemType.parse)
				onSuccess(pgClient.lastDownloads(limit, itemType)){dbc =>
					complete(dbc)
				}
			}
		} ~
		complete(StatusCodes.NotFound)
	}

}
