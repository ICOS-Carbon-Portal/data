package se.lu.nateko.cp.data

import akka.actor.{ActorSystem, Props}
import akka.pattern.ask
import spray.http.StatusCodes
import spray.can.Http
import scala.concurrent.Await
import scala.concurrent.duration._
import akka.io.IO
import spray.can.Http
import akka.util.Timeout


object Main extends App {

	implicit val system = ActorSystem("cpauth")
	implicit val timeout = Timeout(5 seconds)
	implicit val dispatcher = system.dispatcher

	val handler = system.actorOf(Props[ServiceActor], name = "handler")
	
	IO(Http).ask(Http.Bind(handler, interface = "localhost", port = 9010))
		.onSuccess{ case _ =>
			sys.addShutdownHook{
				akka.io.IO(Http) ! akka.actor.PoisonPill
				Thread.sleep(1000)
				system.shutdown()
			}
		}

}
