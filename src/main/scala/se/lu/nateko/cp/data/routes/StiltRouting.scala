package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import spray.json.DefaultJsonProtocol._
//import akka.http.scaladsl.model.StatusCodes

import se.lu.nateko.cp.data.services.fetch.StiltResultsFetcher
import akka.http.scaladsl.server.Route
import se.lu.nateko.cp.data.StiltConfig

object StiltRouting{

	def apply(config: StiltConfig): Route = {
		val service = new StiltResultsFetcher(config)

		pathPrefix("stilt"){
			path("stationyears"){
				complete(service.getStationsAndYears)
			} ~
			path("listfootprints"){
				parameters("stationId", "year".as[Int]){(stationId, year) =>
					complete(service.getFootprintFiles(stationId, year))
				}
			}
		}
	}
}
