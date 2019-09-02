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
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.StaticCollection
import spray.json._

class PortalLogClient(val config: RestHeartConfig, http: HttpExt)(implicit m: Materializer) {

	import http.system.dispatcher

	def logDownload(dobj: DataObject, ip: String, extraProps: (String, String)*)(implicit envri: Envri): Future[Done] = {
		import se.lu.nateko.cp.meta.core.data.JsonSupport.dataObjectFormat

		val basePayload = extraProps.map{
				case(prop, value) => prop -> JsString(value)
			} :+ "dobj" -> dobj.toJson

		val logUri = Uri(config.dobjDownloadLogUri.toASCIIString)
		logDownloadInternal(logUri, basePayload, ip, "data object")
	}

	def logDownload(coll: StaticCollection, ip: String)(implicit envri: Envri): Future[Done] = {
		import se.lu.nateko.cp.meta.core.data.JsonSupport.staticCollFormat

		val basePayload = Seq("coll" -> coll.toJson)

		val logUri = Uri(config.collDownloadLogUri.toASCIIString)
		logDownloadInternal(logUri, basePayload, ip, "collection")
	}

	private def logDownloadInternal(logUri: Uri, basePayload: Seq[(String, JsValue)], ip: String, descr: String): Future[Done] = {

		val logItemProps = basePayload :+
			"time" -> JsString(java.time.Instant.now().toString) :+
			"ip" -> JsString(ip)

		for(
			entity <- Marshal(JsObject(logItemProps:_*)).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = logUri, method = HttpMethods.POST, entity = entity))
		) yield {
			r.discardEntityBytes()
			if(r.status == StatusCodes.OK) done
			else Future.failed(new Exception(s"Failed logging $descr download to the portal log at $logUri: ${r.status}"))
		}
	}.flatten

}
