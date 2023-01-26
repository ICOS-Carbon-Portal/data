package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshalling.ToEntityMarshaller
import akka.http.scaladsl.marshalling.ToResponseMarshallable
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.*
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.unmarshalling.Unmarshaller

import java.time.Instant

import scala.concurrent.Future
import scala.util.Try

import spray.json.DefaultJsonProtocol
import spray.json.*

import se.lu.nateko.cp.data.services.dlstats.PostgresDlLog
import se.lu.nateko.cp.data.CpdataJsonProtocol.given
import se.lu.nateko.cp.data.services.dlstats.DlItemType
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.data.EnvriConfig

object StatsRouting:
	import DefaultJsonProtocol._

	case class StatsQueryParams(
		pageOpt: Option[Int],
		pagesizeOpt: Option[Int],
		specs: Option[Seq[String]],
		stations: Option[Seq[String]],
		submitters: Option[Seq[String]],
		contributors: Option[Seq[String]],
		dlfrom: Option[Seq[String]],
		originStations: Option[Seq[String]],
		hashId: Option[String],
		dlStart: Option[String],
		dlEnd: Option[String],
	){
		def page = pageOpt.getOrElse(1)
		def pagesize = Math.min(100000, pagesizeOpt.getOrElse(100))
	}
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
	case class DateCount(date: String, count: Int)
	case class PointPosition(`type`: String, coordinates: Tuple2[Double, Double])
	case class Download(
		itemType: String,
		ts: Instant,
		hashId: String,
		ip: String,
		city: Option[String],
		countryCode: Option[String],
		endUser: Option[String],
		geoJson: Option[PointPosition]
	)
	case class CustomDownloadsPerYearCountry(year: Int, country: String, downloads: Int)

	given RootJsonFormat[StatsQueryParams] = jsonFormat11(StatsQueryParams.apply)
	given RootJsonFormat[PointPosition] = jsonFormat2(PointPosition.apply)
	given RootJsonFormat[DownloadsByCountry] = jsonFormat2(DownloadsByCountry.apply)
	given RootJsonFormat[DownloadsPerWeek] = jsonFormat3(DownloadsPerWeek.apply)
	given RootJsonFormat[DownloadsPerTimeframe] = jsonFormat2(DownloadsPerTimeframe.apply)
	given RootJsonFormat[DownloadObjStat] = jsonFormat2(DownloadObjStat.apply)
	given RootJsonFormat[DownloadStats] = jsonFormat2(DownloadStats.apply)
	given RootJsonFormat[Specifications] = jsonFormat2(Specifications.apply)
	given RootJsonFormat[Contributors] = jsonFormat2(Contributors.apply)
	given RootJsonFormat[Submitters] = jsonFormat2(Submitters.apply)
	given RootJsonFormat[Stations] = jsonFormat2(Stations.apply)
	given RootJsonFormat[DownloadedFrom] = jsonFormat2(DownloadedFrom.apply)
	given RootJsonFormat[DownloadCount] = jsonFormat1(DownloadCount.apply)
	given RootJsonFormat[DateCount] = jsonFormat2(DateCount.apply)
	given RootJsonFormat[Download] = jsonFormat8(Download.apply)
	given RootJsonFormat[CustomDownloadsPerYearCountry] = jsonFormat3(CustomDownloadsPerYearCountry.apply)

	def parsePointPosition(jsonStr: String): Option[PointPosition] =
		Try{jsonStr.parseJson.convertTo[PointPosition]}.toOption

end StatsRouting


class StatsRouting(pgClient: PostgresDlLog, coreConf: MetaCoreConfig) extends SprayRouting:
	import StatsRouting.*

	given envriConfs: Map[Envri,EnvriConfig] = coreConf.envriConfigs
	val extractEnvri = UploadRouting.extractEnvriDirective

	def statsQuery[T](lastSegm: String, fetcher: StatsQueryParams => Future[T])(using conv: T => ToResponseMarshallable): Route = path(lastSegm){
		post{
			entity(as[StatsQueryParams]){ qp =>
				onSuccess(fetcher(qp)){res =>
					complete(conv(res))
				}
			}
		} ~
		get{
			import DefaultJsonProtocol.*
			parameters(
				"page".as[Int].?,
				"pagesize".as[Int].?,
				"specs".as[List[String]].?,
				"stations".as[List[String]].?,
				"submitters".as[List[String]].?,
				"contributors".as[List[String]].?,
				"dlfrom".as[List[String]].?,
				"originStations".as[List[String]].?,
				"hashId".as[String].?,
				"dlStart".as[String].?,
				"dlEnd".as[String].?
			).as(StatsQueryParams.apply _){qp =>
				onSuccess(fetcher(qp)){res =>
					complete(conv(res))
				}
			}
		}
	}

	private def setOriginHeader(using envri: Envri): Directive0 = headerValueByType(Origin).tflatMap{ case Tuple1(originH) =>
		def isFromEnvri(origin: HttpOrigin): Boolean = envriConfs.get(envri).exists{ envriConf =>
			val envriDomain = envriConf.dataHost.split(".").takeRight(2).mkString(".")
			origin.host.toString.endsWith(envriDomain)
		}
		originH.origins.toList match{
			case origin :: _ if isFromEnvri(origin) =>
				respondWithHeader(`Access-Control-Allow-Origin`(origin))
			case _ => pass
		}
	}.or(pass)

	val route: Route = pathPrefix("stats" / "api") { extractEnvri{
		((get | post) & setOriginHeader){
			get{
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
				}
			} ~
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
			path("downloadedCollections"){
				onSuccess(pgClient.downloadedCollections){dbc =>
					complete(dbc)
				}
			} ~
			statsQuery("customDownloadsPerYearCountry", pgClient.customDownloadsPerYearCountry) ~
			complete(StatusCodes.NotFound)
		} ~
		(options & setOriginHeader){
			respondWithHeader(`Access-Control-Allow-Methods`(HttpMethods.GET)){
				complete(StatusCodes.OK)
			}
		}
	}}
end StatsRouting
