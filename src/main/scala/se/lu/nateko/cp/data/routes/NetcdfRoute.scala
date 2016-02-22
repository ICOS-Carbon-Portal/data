package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

import se.lu.nateko.cp.data.formats.netcdf.RasterMarshalling
import se.lu.nateko.cp.data.formats.netcdf.viewing.ViewServiceFactory

import spray.json.DefaultJsonProtocol._

object NetcdfRoute {
	def apply(factory: ViewServiceFactory): Route = {

		implicit val rasterMarshalling = RasterMarshalling.marshaller

		(get & pathPrefix("netcdf")){
			pathEndOrSingleSlash{
				getFromResource("netcdf.html")
			} ~
			path("bundle.js"){
				getFromResource("bundle.js")
			} ~
			path("listNetCdfFiles"){
				complete(factory.getNetCdfFiles)
			} ~
			path("listDates"){
				parameter('service){ service =>
					complete(factory.getNetCdfViewService(service).getAvailableDates())
				}
			} ~
			path("listVariables"){
				parameter('service){ service =>
					complete(factory.getNetCdfViewService(service).getVariables())
				}
			} ~
			path("listElevations"){
				parameter('service, 'varName){ (service, varName) =>
					complete(factory.getNetCdfViewService(service).getAvailableElevations(varName))
				}
			} ~
			path("getSlice"){
				parameters('service, 'date, 'varName, 'elevation?){(service, date, varName, elevation) =>
					val raster = factory
						.getNetCdfViewService(service)
						.getRaster(date, varName, elevation.getOrElse(null))
					complete(raster)
				}
			}
		}

	}
}