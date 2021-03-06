package se.lu.nateko.cp.data.api

import scala.concurrent.Future

import akka.Done
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.RequestEntity
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.stream.Materializer
import se.lu.nateko.cp.data.RestHeartConfig
import se.lu.nateko.cp.data.utils.Akka.done
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.StaticCollection
import spray.json._
import se.lu.nateko.cp.cpauth.core.DownloadEventInfo

class PortalLogClient(val config: RestHeartConfig, http: HttpExt)(implicit m: Materializer){

	import http.system.dispatcher

	def logDownload(dlInfo: DownloadEventInfo)(implicit envri: Envri): Future[Done] = {
		val logUri = Uri(config.downloadLogUri.toASCIIString)
		val descr = dlInfo.getClass.getName
		for(
			entity <- Marshal(dlInfo).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = logUri, method = HttpMethods.POST, entity = entity))
		) yield {
			r.discardEntityBytes()
			if(r.status == StatusCodes.OK) done
			else Future.failed(new Exception(s"Failed logging $descr download from ip ${dlInfo.ip} to the portal log at $logUri: ${r.status}"))
		}
	}.flatten

}
