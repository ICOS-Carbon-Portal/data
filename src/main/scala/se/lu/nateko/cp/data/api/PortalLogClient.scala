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
import se.lu.nateko.cp.meta.core.data.StaticObject
import se.lu.nateko.cp.meta.core.data.DocObject
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.StaticCollection
import spray.json._

class PortalLogClient(val config: RestHeartConfig, http: HttpExt)(implicit m: Materializer) {

	import http.system.dispatcher

	def logDownload(obj: StaticObject, ip: String, extraProps: (String, String)*)(implicit envri: Envri): Future[Done] = {
		import se.lu.nateko.cp.meta.core.data.JsonSupport.staticObjectFormat
		val (prop, descr) = obj match{
			case _: DataObject => ("dobj", "data object")
			case _: DocObject => ("doc", "document object")
		}

		val basePayload = extraProps.map{
				case(prop, value) => prop -> JsString(value)
			} :+ prop -> obj.toJson

		val logUri = Uri(config.dobjDownloadLogUri.toASCIIString)
		logDownloadInternal(logUri, basePayload, ip, descr)
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
