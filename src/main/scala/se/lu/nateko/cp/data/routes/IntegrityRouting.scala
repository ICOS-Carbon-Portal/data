package se.lu.nateko.cp.data.routes

import se.lu.nateko.cp.data.services.fetch.IntegrityControlService

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.model.ContentTypes
import akka.stream.scaladsl.Flow
import akka.util.ByteString
import akka.http.scaladsl.model.HttpEntity
import java.nio.charset.StandardCharsets
import se.lu.nateko.cp.data.api.MetaClient.Paging

import scala.concurrent.duration.DurationInt
import akka.stream.scaladsl.Source

object IntegrityRouting{
	import IntegrityControlService.ReportSource

	def route(service: IntegrityControlService) = pathPrefix("integrityControl"){

		parameters("fix".?, "offset".as[Int].?, "limit".as[Int].?){(fix, offsetOpt, limitOpt) =>

			val paging = new Paging(offsetOpt.getOrElse(0), limitOpt)

			def respondWithReport(maker: Boolean => ReportSource) = {
				val src = maker(fix.contains("true"))
				complete(responseEntity(src.map(_.statement)))
			}

			path("local"){
				respondWithReport(service.getReportOnLocal(_, paging))
			} ~
			path("remote"){
				respondWithReport(service.getReportOnRemote(_, paging))
			} ~
			path("objectslist"){
				respondWithReport(_ => service.getObjectsList(paging))
			} ~
			(path("listirodsfolder") & parameter("path")){path =>
				complete(service.listIrodsFolder(path).mkString("\n"))
			} ~
			path("dummy"){
				val src = Source.repeat("Dummy string to test long-running responses to HTTP GET requests in Akka HTTP")
				complete(responseEntity(src.throttle(10, 1.second)))
			}
		}
	}

	private def responseEntity(text: Source[String, Any]) = HttpEntity(
		ContentTypes.`text/plain(UTF-8)`,
		text.map(s => ByteString(s"${s}\n", StandardCharsets.UTF_8))
	)
}
