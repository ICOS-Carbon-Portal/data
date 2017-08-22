package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.unmarshalling.Unmarshaller

import scala.concurrent.Future

import se.lu.nateko.cp.data.formats.netcdf.RasterMarshalling
import se.lu.nateko.cp.data.formats.netcdf.viewing.ViewServiceFactory
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import spray.json.DefaultJsonProtocol._

object NetcdfRoute {

	private implicit val rasterMarshalling = RasterMarshalling.marshaller

	def apply(factory: ViewServiceFactory): Route = {

		(get & pathPrefix("netcdf")){
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
				parameter(('service, 'varName)){ (service, varName) =>
					complete(factory.getNetCdfViewService(service).getAvailableElevations(varName))
				}
			} ~
			path("getSlice"){
				parameters(('service, 'date, 'varName, 'elevation.?)){(service, date, varName, elevation) =>
					val raster = factory
						.getNetCdfViewService(service)
						.getRaster(date, varName, elevation.getOrElse(null))
					complete(raster)
				}
			}
		}

	}

	def cp(factory: ViewServiceFactory): Route = {

		implicit val hashDeser = Unmarshaller.apply[String, Sha256Sum](
			_ => s => Future.fromTry(Sha256Sum.fromString(s))
		)

		(get & pathPrefix("netcdf")){
			path("listDates"){
				parameter('service.as[Sha256Sum]){ hash =>
					complete(factory.getNetCdfViewService(hash.id).getAvailableDates)
				}
			} ~
			path("listVariables"){
				parameter('service.as[Sha256Sum]){ hash =>
					complete(factory.getNetCdfViewService(hash.id).getVariables)
				}
			} ~
			path("listElevations"){
				parameter(('service.as[Sha256Sum], 'varName)){ (hash, varName) =>
					complete(factory.getNetCdfViewService(hash.id).getAvailableElevations(varName))
				}
			} ~
			path("getSlice"){
				parameters(('service.as[Sha256Sum], 'date, 'varName, 'elevation.?)){(hash, date, varName, elevation) =>
					val raster = factory
						.getNetCdfViewService(hash.id)
						.getRaster(date, varName, elevation.getOrElse(null))
					complete(raster)
				}
			}
		}

	}

}
