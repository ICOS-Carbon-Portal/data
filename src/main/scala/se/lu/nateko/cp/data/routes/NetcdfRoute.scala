package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshalling.ToResponseMarshaller
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.unmarshalling.Unmarshaller
import se.lu.nateko.cp.data.formats.netcdf.Raster
import se.lu.nateko.cp.data.formats.netcdf.RasterMarshalling
import se.lu.nateko.cp.data.formats.netcdf.ViewServiceFactory
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import scala.concurrent.Future
import se.lu.nateko.cp.data.formats.netcdf.NetCdfViewService

class NetcdfRoute(factory: ViewServiceFactory) extends SprayRouting:
	import se.lu.nateko.cp.data.CpdataJsonProtocol.varInfoFormat
	private given ToResponseMarshaller[Raster] = RasterMarshalling.marshaller

	def cp: Route = route(netCdfDataObjService)
	def plain: Route = route(netCdfPlainFileService)

	def netCdfPlainFileService: Directive1[NetCdfViewService] =
		parameter("service").map(factory.getNetCdfViewService)

	def netCdfDataObjService:  Directive1[NetCdfViewService] =
		//TODO Look into changing Sha256Sum's json format in meta core from RootJsonFormat to non-Root
		given Unmarshaller[String, Sha256Sum] = Unmarshaller(
			_ => s => Future.fromTry(Sha256Sum.fromString(s))
		)
		parameter("service".as[Sha256Sum]).map(hash => factory.getNetCdfViewService(hash.id))

	private def route(extractNetcdfService: Directive1[NetCdfViewService]): Route =
		(get & pathPrefix("netcdf")){
			path("listNetCdfFiles"){
				complete(factory.getNetCdfFiles())
			} ~
			extractNetcdfService{service =>
				path("listDates"){
					complete(service.getAvailableDates.map(_.toString))
				} ~
				path("listVariables"){
					complete(service.getVariables)
				} ~
				path("getSlice"){
					parameters("dateInd".as[Int], "varName", "extraDimInd".as[Int].?){(dateInd, varName, elInd) =>
						complete(service.getRaster(dateInd, varName, elInd))
					}
				} ~
				path("getCrossSection"){
					parameters("varName", "latInd".as[Int], "lonInd".as[Int], "extraDimInd".as[Int].?){
						(varName, latInd, lonInd, elInd) =>
							complete(service.getTemporalCrossSection(varName, latInd, lonInd, elInd))
					}
				}
			}
		}

end NetcdfRoute
