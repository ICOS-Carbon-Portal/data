package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._

import se.lu.nateko.cp.data.services.fetch.StiltResultsFetcher
import akka.http.scaladsl.server.Route
import spray.json.DefaultJsonProtocol
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.ContentTypes

import se.lu.nateko.cp.data.formats.netcdf.RasterMarshalling

object StiltRouting extends DefaultJsonProtocol{

	case class StiltResultsRequest(stationId: String, year: Int, columns: Seq[String])

	def apply(service: StiltResultsFetcher): Route = {

		implicit val rasterMarshalling = RasterMarshalling.marshaller
		implicit val stiltResultsRequestFormat = jsonFormat3(StiltResultsRequest)

		pathPrefix("stilt"){
			get{
				path("stationyears"){
					complete(service.getStationsAndYears)
				} ~
				path("listfootprints"){
					parameters("stationId", "year".as[Int]){(stationId, year) =>
						complete(service.getFootprintFiles(stationId, year))
					}
				} ~
				path("footprint"){
					parameters("stationId", "footprint"){(stationId, filename) =>
						complete(service.getFootprintRaster(stationId, filename))
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
