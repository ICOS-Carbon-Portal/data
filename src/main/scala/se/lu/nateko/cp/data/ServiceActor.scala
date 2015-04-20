package se.lu.nateko.cp.data

import akka.actor._
import spray.can.Http
import spray.http._
import HttpMethods._

class ServiceActor extends Actor with ActorLogging {

	def receive = {
		// when a new connection comes in we register ourselves as the connection handler
		case _: Http.Connected => sender ! Http.Register(self)
		
		case HttpRequest(GET, Uri.Path("/ping"), _, _, _) => sender ! HttpResponse(entity = "PONG!")
		
		case _: HttpRequest => sender ! HttpResponse(status = 404, entity = "Unknown resource!")
		
		case Timedout(HttpRequest(method, uri, _, _, _)) => sender ! HttpResponse(
				status = 500,
				entity = "The " + method + " request to '" + uri + "' has timed out..."
			)
	}

}