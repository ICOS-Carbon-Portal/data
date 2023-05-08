package se.lu.nateko.cp.data.api

import akka.actor.ActorSystem
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.data.PostgresConfigs
import se.lu.nateko.cp.geoipclient.CpGeoClient
import se.lu.nateko.cp.geoipclient.GeoIpInfo
import spray.json.JsObject
import spray.json.JsString
import spray.json.*

import scala.util.Failure
import scala.util.Success

import CpGeoClient.given

class PortalLogger(
	geoClient: CpGeoClient, confPg: PostgresConfigs
)(using system: ActorSystem):

	import system.dispatcher
	private val pgLogClient = new PostgresClient(confPg)

	def logDl(entry: DlEventForPostgres)(using Envri): Unit = logInternally(entry.ip){ipinfo =>
		pgLogClient.logDownload(entry, ipinfo).failed.foreach{err =>
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
