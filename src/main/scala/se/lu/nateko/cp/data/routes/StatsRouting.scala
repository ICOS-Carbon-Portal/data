package se.lu.nateko.cp.data.routes

import se.lu.nateko.cp.data.ConfigReader
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives._
import se.lu.nateko.cp.data.services.dlstats.PostgresDlLog
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import spray.json.DefaultJsonProtocol
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._


case class DownloadStats(count: Int, countryCode: String)
case class QueryParams(specs: Option[List[String]], stations: Option[List[String]], submitters: Option[List[String]], contributors: Option[List[String]])

class StatsRouting(pgClient: PostgresDlLog, coreConf: MetaCoreConfig) extends DefaultJsonProtocol {
	implicit val downloadStats = jsonFormat2(DownloadStats)
	implicit val envriConfs = coreConf.envriConfigs
	val extractEnvri = UploadRouting.extractEnvriDirective

	val route: Route = (pathPrefix("stats" / "api") & extractEnvri){ implicit envri =>

		path("downloadsByCountry"){
			parameters(
					"specs".as[List[String]].?,
					"stations".as[List[String]].?,
					"submitters".as[List[String]].?,
					"contributors".as[List[String]].?) 
				{(specs, stations, submitters, contributors) =>
				val queryParams = QueryParams(specs, stations, submitters, contributors)
				val downloadsByCountry = pgClient.downloadsByCountry(queryParams)
				
				onSuccess(downloadsByCountry){dbc =>
					complete(dbc)
				}
			}
		}
	}

}
