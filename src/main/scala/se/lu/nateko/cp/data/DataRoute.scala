package se.lu.nateko.cp.data

import se.lu.nateko.cp.netcdf.viewing.ViewServiceFactory
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import JsonSerializer._
import akka.stream.scaladsl.Sink
import akka.stream.Materializer
import scala.concurrent.Future

object DataRoute {

	def apply(factory: ViewServiceFactory)(implicit mat: Materializer): Route = {

		(get & pathPrefix("netcdf")){
			pathEndOrSingleSlash{
				complete(StaticResources.netcdfWidgetPage)
			} ~
			path("bundle.js"){
				complete(StaticResources.bundleScript)
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
					val raster = factory.getNetCdfViewService(service).getRaster(date, varName, elevation.getOrElse(null))
					complete(toRasterMessage(raster))
				}
			}
		} ~
		put{
			extractRequest{ req =>
				val lengthFuture: Future[Long] = req.entity.dataBytes
					.map(_.size)
					.runWith(Sink.fold(0L){_ + _})

				onSuccess(lengthFuture){length =>
					complete(length.toString)
				}
			}
		}
		
	}
}