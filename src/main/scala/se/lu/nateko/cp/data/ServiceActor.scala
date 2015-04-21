package se.lu.nateko.cp.data

import akka.actor._
import spray.can.Http
import spray.http._
import HttpMethods._
import StaticResources._

class ServiceActor extends Actor with ActorLogging {

	def receive = handleStatic(
		"/carbontracker/" -> carbonTrackerWidgetPage,
		"/carbontracker/script.js" -> carbonTrackerScript
	).orElse{

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