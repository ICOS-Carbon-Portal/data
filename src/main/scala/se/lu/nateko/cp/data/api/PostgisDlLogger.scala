package se.lu.nateko.cp.data.api

import akka.actor.ActorSystem
import eu.icoscp.envri.Envri
import eu.icoscp.geoipclient.CpGeoClient
import eu.icoscp.geoipclient.GeoIpInfo
import spray.json.JsObject
import spray.json.JsString
import spray.json.*

import scala.util.Failure
import scala.util.Success

import CpGeoClient.given

class PostgisDlLogger(
	geoClient: CpGeoClient, pgLogWriter: PostgisEventWriter
)(using system: ActorSystem):

	import system.dispatcher

	def logDl(entry: DlEventForPostgres, ip: String)(using Envri): Unit = logInternally(ip){ipinfo =>
		pgLogWriter.logDownload(entry, ipinfo).failed.foreach{err =>
			system.log.error(err, "Could not log download to Postgres")
		}
	}

	private def logInternally(ip: String)(logAction: Either[String, GeoIpInfo] => Unit): Unit =
		geoClient.lookup(ip).onComplete{
			case Success(ipinfo) =>
				logAction(Right(ipinfo))
			case Failure(err) =>
				logAction(Left(ip))
				system.log.error(err, s"Could not fetch GeoIP information for ip $ip")
		}
