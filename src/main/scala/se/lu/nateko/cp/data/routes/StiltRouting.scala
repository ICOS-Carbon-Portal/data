package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import spray.json.DefaultJsonProtocol._

import se.lu.nateko.cp.data.services.fetch.StiltResultsFetcher
import akka.http.scaladsl.server.Route
import se.lu.nateko.cp.data.StiltConfig
import spray.json.DefaultJsonProtocol
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.ContentTypes

object StiltRouting extends DefaultJsonProtocol{

	case class StiltResultsRequest(stationId: String, year: Int, columns: Seq[String])
	implicit val stiltResultsRequestFormat = jsonFormat3(StiltResultsRequest)

	def apply(config: StiltConfig): Route = {
		val service = new StiltResultsFetcher(config)

		pathPrefix("stilt"){
			get{
				path("stationyears"){
					complete(service.getStationsAndYears)
				} ~
				path("listfootprints"){
					parameters("stationId", "year".as[Int]){(stationId, year) =>
						complete(service.getFootprintFiles(stationId, year))
					}
				}
			} ~
			post{
				path("stiltresult"){
					entity(as[StiltResultsRequest]){req =>
						val src = service.getStiltResultJson(req.stationId, req.year, req.columns)
						val respEntity = HttpEntity(ContentTypes.`application/json`, src)
						complete(HttpResponse(entity = respEntity))
					}
				}
			}
		}
	}
}
