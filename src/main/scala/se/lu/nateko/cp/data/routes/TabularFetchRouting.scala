package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.model.StatusCodes
import akka.stream.Materializer

import se.lu.nateko.cp.data.CpdataJsonProtocol._
import se.lu.nateko.cp.data.services.fetch.BinTableRequest
import se.lu.nateko.cp.data.services.fetch.FromBinTableFetcher

class TabularFetchRouting(fetcher: FromBinTableFetcher)(implicit mat: Materializer) {

	val route = pathPrefix("portal"){
		path("portal.js"){
			getFromResource("portal.js")
		} ~
		pathSingleSlash{
			getFromResource("portal.html")
		} ~
		(post & path("tabular")){
			entity(as[BinTableRequest]){ tableRequest =>
				complete(
					HttpEntity(
						ContentTypes.`application/octet-stream`,
						fetcher.getResponseSize(tableRequest),
						fetcher.getSource(tableRequest)
					)
				)
			} ~
			complete((StatusCodes.BadRequest, s"Expected a proper binary table request"))
		}
	}
}

