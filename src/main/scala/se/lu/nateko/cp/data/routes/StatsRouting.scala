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

class StatsRouting(pgClient: PostgresDlLog, coreConf: MetaCoreConfig) extends DefaultJsonProtocol {
	implicit val downloadsByCountryFormat = jsonFormat2(DownloadsByCountry)
	implicit val downloadsPerWeekFormat = jsonFormat3(DownloadsPerWeek)
	implicit val downloadsPerTimeframeFormat = jsonFormat2(DownloadsPerTimeframe)
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
				val downloadsByCountry = pgClient.downloadsByCountry(queryParams)
				
				onSuccess(downloadsByCountry){dbc =>
					complete(dbc)
				}
			} ~
			complete(StatusCodes.BadRequest -> "Expecting only 'specs', 'stations', 'submitters' or 'contributors' as parameters")
		} ~
		path("downloadsPerWeek"){
			statsParams{queryParams =>
				val downloadsPerWeek = pgClient.downloadsPerWeek(queryParams)
				
				onSuccess(downloadsPerWeek){dbc =>
					complete(dbc)
				}
			}
		} ~
		path("downloadsPerMonth"){
			statsParams{queryParams =>
				val downloadsPerMonth = pgClient.downloadsPerMonth(queryParams)
				
				onSuccess(downloadsPerMonth){dbc =>
					complete(dbc)
				}
			}
		} ~
		path("downloadsPerYear"){
			statsParams{queryParams =>
				val downloadsPerYear = pgClient.downloadsPerYear(queryParams)
				
				onSuccess(downloadsPerYear){dbc =>
					complete(dbc)
				}
			}
		} ~
		complete(StatusCodes.NotFound)
	}

}
