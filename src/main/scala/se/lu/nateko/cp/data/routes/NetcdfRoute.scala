package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.unmarshalling.Unmarshaller

import scala.concurrent.Future

import se.lu.nateko.cp.data.formats.netcdf.RasterMarshalling
import se.lu.nateko.cp.data.formats.netcdf.viewing.ViewServiceFactory
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import spray.json.DefaultJsonProtocol
import akka.http.scaladsl.marshalling.ToResponseMarshaller
import se.lu.nateko.cp.data.formats.netcdf.viewing.Raster
import spray.json.RootJsonFormat
import spray.json.JsonFormat
import spray.json.JsonWriter

object NetcdfRoute extends DefaultJsonProtocol {
	private given [T: JsonFormat]: RootJsonFormat[IndexedSeq[T]] = immIndexedSeqFormat
	private given ToResponseMarshaller[Raster] = RasterMarshalling.marshaller

	def apply(factory: ViewServiceFactory): Route = {

		(get & pathPrefix("netcdf")){
			path("listNetCdfFiles"){
				complete(factory.getNetCdfFiles())
			} ~
			path("listDates"){
				parameter("service"){ service =>
					complete(factory.getNetCdfViewService(service).getAvailableDates.map(_.toString))
				}
			} ~
			path("listVariables"){
				parameter("service"){ service =>
					complete(factory.getNetCdfViewService(service).getVariables)
				}
			} ~
			path("listElevations"){
				parameter("service", "varName"){ (service, varName) =>
					complete(factory.getNetCdfViewService(service).getAvailableElevations(varName))
				}
			} ~
			path("getSlice"){
				parameters("service", "dateInd".as[Int], "varName", "elevationInd".as[Int].?){(service, date, varName, elInd) =>
					val raster = factory
						.getNetCdfViewService(service)
						.getRaster(date, varName, elInd)
					complete(raster)
				}
			} ~
			path("getCrossSection"){
				parameters("service", "varName", "latInd".as[Int], "lonInd".as[Int], "elevationInd".as[Int].?){
					(service, varName, latInd, lonInd, elInd) =>
						val timeSeries = factory
							.getNetCdfViewService(service)
							.getTemporalCrossSection(varName, latInd, lonInd, elInd)
						complete(timeSeries)
				}
			}
		}

	}

	def cp(factory: ViewServiceFactory): Route = {

		//TODO Look into changing Sha256Sum's json format in meta core from RootJsonFormat to non-Root
		given Unmarshaller[String, Sha256Sum] = Unmarshaller(
			_ => s => Future.fromTry(Sha256Sum.fromString(s))
		)

		(get & pathPrefix("netcdf")){
			path("listDates"){
				parameter("service".as[Sha256Sum]){ hash =>
					complete(factory.getNetCdfViewService(hash.id).getAvailableDates.map(_.toString))
				}
			} ~
			path("listVariables"){
				parameter("service".as[Sha256Sum]){ hash =>
					complete(factory.getNetCdfViewService(hash.id).getVariables)
				}
			} ~
			path("listElevations"){
				parameter("service".as[Sha256Sum], "varName"){ (hash, varName) =>
					complete(factory.getNetCdfViewService(hash.id).getAvailableElevations(varName))
				}
			} ~
			path("getSlice"){
				parameters("service".as[Sha256Sum], "dateInd".as[Int], "varName", "elevationInd".as[Int].?){
					(hash, dateInd, varName, elInd) => complete(
						factory.getNetCdfViewService(hash.id).getRaster(dateInd, varName, elInd)
					)
				}
			} ~
			path("getCrossSection"){
				parameters("service".as[Sha256Sum], "varName", "latInd".as[Int], "lonInd".as[Int], "elevationInd".as[Int].?){
					(hash, varName, latInd, lonInd, elInd) => complete(
						factory.getNetCdfViewService(hash.id).getTemporalCrossSection(varName, latInd, lonInd, elInd)
					)
				}
			}
		}

	}
}
