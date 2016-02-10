package se.lu.nateko.cp.data.api

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.ActorMaterializer
import scala.concurrent.Future
import se.lu.nateko.cp.meta.core.sparql.SparqlSelectResult
import se.lu.nateko.cp.meta.core.sparql.JsonSupport._
import java.net.URL

class SparqlClient(url: URL)(implicit system: ActorSystem) {
	implicit val materializer = ActorMaterializer()
	import system.dispatcher

	private val sparqlJson = MediaType.custom("application/sparql-results+json", binary = false)

	private def httpPost(entity: String): Future[HttpResponse] = {
		Http().singleRequest(
			HttpRequest(
				method = HttpMethods.POST,
				uri = url.toString,
				headers = headers.Accept(MediaTypes.`application/json`, sparqlJson) :: Nil,
				entity = entity
			)
		)
	}

	def select(selectQuery: String): Future[SparqlSelectResult] = {
		httpPost(selectQuery).flatMap(
			resp => resp.status match {
				case StatusCodes.OK =>
					val entity = resp.entity.contentType.mediaType match {
						case `sparqlJson` =>
							resp.entity.withContentType(ContentTypes.`application/json`)
						case MediaTypes.`application/json` =>
							resp.entity
						case _ =>
							throw new Exception(s"Server responded with Content Type ${resp.entity.contentType}")
					}
					Unmarshal(entity).to[SparqlSelectResult]
				case _ =>
					Future.failed(new Exception(s"Got ${resp.status} from the server"))
			}
		)
	}

}
