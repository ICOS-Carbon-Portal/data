package se.lu.nateko.cp.data.routes

import se.lu.nateko.cp.data.ConfigReader
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Directive1
import se.lu.nateko.cp.data.services.dlstats.PostgresDlLog
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import spray.json.DefaultJsonProtocol
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import se.lu.nateko.cp.data.CpdataJsonProtocol.javaTimeInstantFormat
import java.time.Instant
import akka.http.scaladsl.model.StatusCodes


case class StatsQueryParams(specs: Option[Seq[String]], stations: Option[Seq[String]], submitters: Option[Seq[String]], contributors: Option[Seq[String]])
case class DownloadsByCountry(count: Int, countryCode: String)
case class DownloadsPerWeek(count: Int, ts: Instant, week: Double)
case class DownloadsPerTimeframe(count: Int, ts: Instant)
case class DownloadStats(count: Int, hashId: String)
case class Specifications(count: Int, spec: String)
case class Contributors(count: Int, contributor: String)
case class Stations(count: Int, station: String)

class StatsRouting(pgClient: PostgresDlLog, coreConf: MetaCoreConfig) extends DefaultJsonProtocol {
	implicit val downloadsByCountryFormat = jsonFormat2(DownloadsByCountry)
	implicit val downloadsPerWeekFormat = jsonFormat3(DownloadsPerWeek)
	implicit val downloadsPerTimeframeFormat = jsonFormat2(DownloadsPerTimeframe)
	implicit val downloadStatsFormat = jsonFormat2(DownloadStats)
	implicit val specificationsFormat = jsonFormat2(Specifications)
	implicit val contributorsFormat = jsonFormat2(Contributors)
	implicit val stationsFormat = jsonFormat2(Stations)
	
	implicit val envriConfs = coreConf.envriConfigs
	val extractEnvri = UploadRouting.extractEnvriDirective

	val statsParams: Directive1[StatsQueryParams] = parameters(
		"specs".as[List[String]].?,
		"stations".as[List[String]].?,
		"submitters".as[List[String]].?,
		"contributors".as[List[String]].?
	).tmap{
		case (specs, stations, submitters, contributors) =>
			Tuple1(StatsQueryParams(specs, stations, submitters, contributors))
	}

	val route: Route = (pathPrefix("stats" / "api") & extractEnvri){ implicit envri =>

		path("downloadsByCountry"){
			statsParams{queryParams =>
				onSuccess(pgClient.downloadsByCountry(queryParams)){dbc =>
					complete(dbc)
				}
			}
		} ~
		path("downloadsPerWeek"){
			statsParams{queryParams =>
				onSuccess(pgClient.downloadsPerWeek(queryParams)){dbc =>
					complete(dbc)
				}
			}
		} ~
		path("downloadsPerMonth"){
			statsParams{queryParams =>
				onSuccess(pgClient.downloadsPerMonth(queryParams)){dbc =>
					complete(dbc)
				}
			}
		} ~
		path("downloadsPerYear"){
			statsParams{queryParams =>
				onSuccess(pgClient.downloadsPerYear(queryParams)){dbc =>
					complete(dbc)
				}
			}
		} ~
		path("downloadStats"){
			statsParams{queryParams =>
				onSuccess(pgClient.downloadStats(queryParams)){dbc =>
					complete(dbc)
				}
			}
		} ~
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
		path("stations"){
			onSuccess(pgClient.stations){dbc =>
				complete(dbc)
			}
		} ~
		complete(StatusCodes.NotFound)
	}

}
