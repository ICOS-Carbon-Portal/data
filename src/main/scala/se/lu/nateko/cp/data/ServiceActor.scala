package se.lu.nateko.cp.data

import akka.actor._
import spray.can.Http
import spray.http._
import HttpMethods._
import StaticResources._
import se.lu.nateko.cp.netcdf.viewing.ViewServiceFactory
import spray.json._
import DefaultJsonProtocol._

class ServiceActor(factory: ViewServiceFactory) extends Actor with ActorLogging {

	def receive = handleStatic(
		"/carbontracker/" -> carbonTrackerWidgetPage,
		"/carbontracker/script.js" -> carbonTrackerScript
		
	).orElse{

		// List of NetCdf files
		case HttpRequest(GET, Uri.Path("/carbontracker/listNetCdfFiles"), _, _, _) =>
			sender ! JsonSerializer.toResponse(factory.getNetCdfFiles)
		
			
		// List of dates in a specific NetCdf file
		case HttpRequest(GET, Uri(_, _, Uri.Path("/carbontracker/listDates"), query, _), _, _, _) => query.get("service") match {
			case Some(fileName) =>
				val dates = factory.getNetCdfViewService(fileName).getAvailableDates()
				sender ! JsonSerializer.toResponse(dates)
			case None => sender ! HttpResponse(status = 400, entity = "Missing 'service' query parameter")
		}	
		
		// List of variables in a specific NetCdf file
		case HttpRequest(GET, Uri(_, _, Uri.Path("/carbontracker/listVariables"), query, _), _, _, _) => query.get("service") match {
			case Some(fileName) =>
				val variables = factory.getNetCdfViewService(fileName).getVariables()
				sender ! JsonSerializer.toResponse(variables)
			case None => sender ! HttpResponse(status = 400, entity = "Missing 'service' query parameter")
		}	

		// Raster
		case HttpRequest(GET, Uri(_, _, Uri.Path("/carbontracker/getSlice"), query, _), _, _, _) => {

			val serviceAndSlice = for(
				service <- query.get("service");
				date <- query.get("date");
				varName <- query.get("varName")
			) yield ((service, date, varName))
			
			serviceAndSlice  match {
				case Some((service, date, varName)) =>
					val raster = factory.getNetCdfViewService(service).getRaster(date, varName)
					sender ! JsonSerializer.toJson(raster)
				case None => sender ! HttpResponse(status = 400, entity = "Missing 'service' and/or 'slice' query parameter(s)")
			}
		}
		
		
		case _: HttpRequest => sender ! HttpResponse(status = 404, entity = "Unknown resource!")

		// when a new connection comes in we register ourselves as the connection handler
		case _: Http.Connected => sender ! Http.Register(self)

		case Timedout(HttpRequest(method, uri, _, _, _)) => sender ! HttpResponse(
				status = 500,
				entity = s"The $method request to '$uri' has timed out."
			)
	}

	def handleStatic(pathsToResources: (String, HttpResponse)*) =
		makeStaticResourceHandler(Map(pathsToResources: _*))

	def makeStaticResourceHandler(pathsToResponses: Map[String, HttpResponse]) =
		new PartialFunction[Any, Unit]{

			override def isDefinedAt(x: Any): Boolean = x match{
				case HttpRequest(GET, Uri.Path(path), _, _, _) => pathsToResponses.contains(path)
				case _ => false
			}
	
			override def apply(x: Any): Unit = {
				val path = x.asInstanceOf[HttpRequest].uri.path.toString
				sender ! pathsToResponses(path)
			}

		}

}