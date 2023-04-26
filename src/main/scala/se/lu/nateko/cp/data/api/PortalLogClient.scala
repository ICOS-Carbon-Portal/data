package se.lu.nateko.cp.data.api

import scala.concurrent.Future

import akka.Done
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.RequestEntity
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.stream.Materializer
import se.lu.nateko.cp.data.RestHeartConfig
import se.lu.nateko.cp.data.utils.akka.done
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.cpauth.core.DownloadEventInfo
import akka.event.LoggingAdapter
import scala.concurrent.duration.DurationInt

class PortalLogClient(val config: RestHeartConfig, http: HttpExt, log: LoggingAdapter)(implicit m: Materializer){

	import http.system.dispatcher

	def logDownload(dlInfo: DownloadEventInfo)(using Envri): Unit = {
		val logUri = Uri(config.downloadLogUri.toASCIIString)
		val descr = dlInfo.getClass.getName
		for(
			entity <- Marshal(dlInfo).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = logUri, method = HttpMethods.POST, entity = entity));
			respStrict <- r.entity.toStrict(2.seconds)
		) yield
			if(r.status != StatusCodes.OK)
				val respText = respStrict.data.utf8String
				log.warning(s"Failed logging $descr download from ip ${dlInfo.ip} to the portal log at $logUri: ${r.status},\n$respText")
	}

}
