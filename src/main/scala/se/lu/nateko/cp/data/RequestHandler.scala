package se.lu.nateko.cp.data

import StaticResources._
import se.lu.nateko.cp.netcdf.viewing.ViewServiceFactory
import akka.http.scaladsl.model._

class RequestHandler(factory: ViewServiceFactory) extends (HttpRequest => HttpResponse) {

	override def apply(req: HttpRequest): HttpResponse = {
		try{
			receiveInner(req)
		}catch{
			case ex: Throwable =>
				val message = ex.getMessage + "\n" + ex.getStackTrace.map(_.toString).mkString("\n")
				HttpResponse(status = StatusCodes.InternalServerError, entity = message)
		}
	}

	private def receiveInner(req: HttpRequest): HttpResponse = handleStatic(
		"/carbontracker/" -> carbonTrackerWidgetPage,
		"/carbontracker/bundle.js" -> bundleScript
		
	).orElse[HttpRequest, HttpResponse]{

		// List of NetCdf files
		case HttpRequest(HttpMethods.GET, Uri.Path("/carbontracker/listNetCdfFiles"), _, _, _) =>
			JsonSerializer.toResponse(factory.getNetCdfFiles)


		// List of dates in a specific NetCdf file
		case HttpRequest(HttpMethods.GET, Uri(_, _, Uri.Path("/carbontracker/listDates"), query, _), _, _, _) => query.get("service") match {
			case Some(fileName) =>
				val dates = factory.getNetCdfViewService(fileName).getAvailableDates()
				JsonSerializer.toResponse(dates)
			case None => HttpResponse(status = 400, entity = "Missing 'service' query parameter")
		}	
		
		// List of variables in a specific NetCdf file
		case HttpRequest(HttpMethods.GET, Uri(_, _, Uri.Path("/carbontracker/listVariables"), query, _), _, _, _) => query.get("service") match {
			case Some(fileName) =>
				val variables = factory.getNetCdfViewService(fileName).getVariables()
				JsonSerializer.toResponse(variables)
			case None => HttpResponse(status = 400, entity = "Missing 'service' query parameter")
		}	

		// Raster
		case HttpRequest(HttpMethods.GET, Uri(_, _, Uri.Path("/carbontracker/getSlice"), query, _), _, _, _) => {

			val serviceAndSlice = for(
				service <- query.get("service");
				date <- query.get("date");
				varName <- query.get("varName")
			) yield ((service, date, varName))
			
			serviceAndSlice  match {
				case Some((service, date, varName)) =>
					val raster = factory.getNetCdfViewService(service).getRaster(date, varName)
					JsonSerializer.toJson(raster)
				case None => HttpResponse(status = 400, entity = "Missing 'service' and/or 'slice' query parameter(s)")
			}
		}
		
		
		case _: HttpRequest => HttpResponse(status = 404, entity = "Unknown resource!")

	}(req)

	def handleStatic(pathsToResources: (String, HttpResponse)*) =
		makeStaticResourceHandler(Map(pathsToResources: _*))

	def makeStaticResourceHandler(pathsToResponses: Map[String, HttpResponse]) =
		new PartialFunction[HttpRequest, HttpResponse]{

			override def isDefinedAt(x: HttpRequest): Boolean = x match{
				case HttpRequest(HttpMethods.GET, Uri.Path(path), _, _, _) => pathsToResponses.contains(path)
				case _ => false
			}
	
			override def apply(x: HttpRequest): HttpResponse = {
				val path = x.asInstanceOf[HttpRequest].uri.path.toString
				pathsToResponses(path)
			}

		}

}