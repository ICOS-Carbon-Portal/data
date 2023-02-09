package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshalling.ToResponseMarshaller
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.unmarshalling.Unmarshaller
import se.lu.nateko.cp.data.NetCdfConfig
import se.lu.nateko.cp.data.formats.netcdf.NetCdfViewService
import se.lu.nateko.cp.data.formats.netcdf.Raster
import se.lu.nateko.cp.data.formats.netcdf.RasterMarshalling
import se.lu.nateko.cp.data.formats.netcdf.ViewServiceFactory
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import java.nio.file.Path
import scala.concurrent.Future

class NetcdfRoutes(netcdfDobjsFolder: Path, dataDemoFolder: Path, config: NetCdfConfig) extends SprayRouting:
	import se.lu.nateko.cp.data.CpdataJsonProtocol.varInfoFormat
	private given ToResponseMarshaller[Raster] = RasterMarshalling.marshaller

	private val dobjViewFactory = ViewServiceFactory(netcdfDobjsFolder, config)
	private val demoFactory = ViewServiceFactory(dataDemoFolder, config)

	private val netCdfDataObjService:  Directive1[NetCdfViewService] =
		//TODO Look into changing Sha256Sum's json format in meta core from RootJsonFormat to non-Root
		given Unmarshaller[String, Sha256Sum] = Unmarshaller(
			_ => s => Future.fromTry(Sha256Sum.fromString(s))
		)
		parameter("service".as[Sha256Sum]).map(hash => dobjViewFactory.getNetCdfViewService(hash.id))

	private val demoFileService: Directive1[NetCdfViewService] =
		parameter("service").map(demoFactory.getNetCdfViewService)

	val dataObjects: Route = route(dobjViewFactory, netCdfDataObjService)
	val dataDemo: Route = route(demoFactory, demoFileService, showFiles = true)

	private def route(
		factory: ViewServiceFactory, extractNetcdfService: Directive1[NetCdfViewService], showFiles: Boolean = false
	): Route =
		(get & pathPrefix("netcdf")){
			path("listNetCdfFiles"){
				if !showFiles then reject
				else complete(factory.getNetCdfFiles().sorted)
			} ~
			extractNetcdfService{service =>
				path("listDates"){
					complete(service.getAvailableDates.map(_.toString))
				} ~
				path("listVariables"){
					complete(service.getVariables)
				} ~
				path("getSlice"){
					parameters("dateInd".as[Int], "varName", "extraDimInd".as[Int].?){(dateInd, varName, extraInd) =>
						complete(service.getRaster(dateInd, varName, extraInd))
					}
				} ~
				path("getCrossSection"){
					parameters("varName", "latInd".as[Int], "lonInd".as[Int], "extraDimInd".as[Int].?){
						(varName, latInd, lonInd, extraInd) =>
							complete(service.getTemporalCrossSection(varName, latInd, lonInd, extraInd))
					}
				} ~
				complete(StatusCodes.BadRequest -> "Not a well-formed NetCDF service request")
			}
		}

end NetcdfRoutes
