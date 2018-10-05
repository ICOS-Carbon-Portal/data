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
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import spray.json._

class PortalLogClient(val config: RestHeartConfig, http: HttpExt)(implicit m: Materializer) {

	import http.system.dispatcher

	def downloadLogUri(implicit envri: Envri) =
		Uri(config.dobjDownloadLogUri.toASCIIString)

	def logDownload(dobj: DataObject, ip: String)(implicit envri: Envri): Future[Done] = {
		import se.lu.nateko.cp.meta.core.data.JsonSupport.dataObjectFormat

		val logItem = JsObject(
			"time" -> JsString(java.time.Instant.now().toString),
			"ip" -> JsString(ip),
			"dobj" -> dobj.toJson
		)

		for(
			entity <- Marshal(logItem).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = downloadLogUri, method = HttpMethods.POST, entity = entity))
		) yield {
			r.discardEntityBytes()
			if(r.status == StatusCodes.OK) Future.successful(Done)
			else Future.failed(new Exception(s"Failed logging data object download to the portal log at $downloadLogUri: ${r.status}"))
		}
	}.flatten

}
