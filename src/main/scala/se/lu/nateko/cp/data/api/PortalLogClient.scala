package se.lu.nateko.cp.data.api

import akka.Done
import akka.event.LoggingAdapter
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.RequestEntity
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.stream.Materializer
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.cpauth.core.DlEventForMongo
import se.lu.nateko.cp.cpauth.core.DownloadEventInfo
import se.lu.nateko.cp.cpauth.core.EmailConfig
import se.lu.nateko.cp.cpauth.core.EmailSender
import se.lu.nateko.cp.data.PostgresConfigs
import se.lu.nateko.cp.data.RestHeartConfig
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.geoipclient.CpGeoClient
import se.lu.nateko.cp.geoipclient.CpGeoConfig
import se.lu.nateko.cp.geoipclient.ErrorEmailer

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt


class PortalLogClient(
	val restHeartConfig: RestHeartConfig,
		postgresConfigs: PostgresConfigs,
		geoipConfig: CpGeoConfig,
		emailConfig: EmailConfig,
		http: HttpExt, 
		log: LoggingAdapter
	)(implicit m: Materializer):

	import http.system.dispatcher
	import PortalLogClient.this.http.system

	val emailSender = new EmailSender(emailConfig)

	val geoClient =
		val errorMailer = new ErrorEmailer(geoipConfig.emailErrorsTo, "Resolving IP to location failed", emailSender)
		new CpGeoClient(geoipConfig, errorMailer)

	def portalLogger = PortalLogger(geoClient, postgresConfigs)

	def logDownload(dlInfo: DownloadEventInfo)(using Envri): Unit =
		dlInfo match
			case pg: DlEventForPostgres => portalLogger.logDl(pg)
			case rh: DlEventForMongo =>
				val logUri = Uri(restHeartConfig.downloadLogUri.toASCIIString)
				val descr = dlInfo.getClass.getName
				for(
					entity <- Marshal(dlInfo).to[RequestEntity];
					r <- http.singleRequest(HttpRequest(uri = logUri, method = HttpMethods.POST, entity = entity));
					respStrict <- r.entity.toStrict(2.seconds)
				) yield
					if(r.status != StatusCodes.OK)
						val respText = respStrict.data.utf8String
						log.warning(s"Failed logging $descr download from ip ${dlInfo.ip} to the portal log at $logUri: ${r.status},\n$respText")
