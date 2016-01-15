package se.lu.nateko.cp.data.api

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.ActorMaterializer
import se.lu.nateko.cp.data.{SparqlEndpointConfig, ConfigReader}
import scala.concurrent.Future
import spray.json._
import SparqlClient.Binding


sealed trait BoundValue
case class BoundLiteral(value: String, dataType: Option[Uri]) extends BoundValue
case class BoundUri(value: Uri) extends BoundValue

case class SparqlResultHead(vars: Seq[String])
case class SparqlResultResults(bindings: Seq[Binding])
case class SparqlSelectResult(head: SparqlResultHead, results: SparqlResultResults)

object SparqlClient extends DefaultJsonProtocol{

	type Binding = Map[String, BoundValue]

	def default(implicit system: ActorSystem) = new SparqlClient(ConfigReader.getDefault.meta)

	def apply(config: SparqlEndpointConfig)(implicit system: ActorSystem) = new SparqlClient(config)

	implicit object uriFormat extends RootJsonFormat[Uri] {
		def write(uri: Uri) = JsString(uri.toString)
		def read(value: JsValue): Uri = value match{
			case JsString(s) => Uri(s)
			case _ => deserializationError("String expected")
		}
	}

	implicit val boundLitFormat = jsonFormat2(BoundLiteral)
	implicit val boundUriFormat = jsonFormat1(BoundUri)

	implicit object boundValueFormat extends RootJsonFormat[BoundValue] {
		def write(bv: BoundValue) = bv match{
			case uri: BoundUri => uri.toJson
			case lit: BoundLiteral => lit.toJson
		}

		def read(value: JsValue) = value match {
			case JsObject(fields) => fields.get("type") match {
				case Some(JsString("uri")) => value.convertTo[BoundUri]
				case Some(JsString("literal")) => value.convertTo[BoundLiteral]
				case _ => deserializationError("Expected a URI or a Literal")
			}
			case _ => deserializationError("JsObject expected")
		}
	}
	implicit val sparqlResultHeadFormat = jsonFormat1(SparqlResultHead)
	implicit val sparqlResultResultsFormat = jsonFormat1(SparqlResultResults)
	implicit val sparqlSelectResultFormat = jsonFormat2(SparqlSelectResult)
}

class SparqlClient(config: SparqlEndpointConfig)(implicit system: ActorSystem) {
	implicit val materializer = ActorMaterializer()
	import system.dispatcher
	import SparqlClient._

	private def httpPost(entity: String): Future[HttpResponse] = {
		Http().singleRequest(
			HttpRequest(
				method = HttpMethods.POST,
				uri = config.url,
				headers = headers.Accept(MediaTypes.`application/json`) :: Nil,
				entity = entity
			)
		)
	}

	def select(selectQuery: String): Future[SparqlSelectResult] = {
		httpPost(selectQuery).flatMap(
			resp => resp.status match {
				case StatusCodes.OK =>
					resp.entity.contentType.toString() match {
						case "application/sparql-results+json" =>
							val entity = resp.entity.withContentType(ContentTypes.`application/json`)
							Unmarshal(entity).to[SparqlSelectResult]

						case _ => Future.failed(new Exception(s"Server responded with Content Type ${resp.entity.contentType.toString()}"))
					}
				case _ => Future.failed(new Exception(s"Got ${resp.status} from the server"))
			}
		)
	}

}
