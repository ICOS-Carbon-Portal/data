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
import se.lu.nateko.cp.netcdf.viewing.ViewServiceFactory
import se.lu.nateko.cp.netcdf.viewing.ServiceSpecification
import se.lu.nateko.cp.netcdf.viewing.impl.ViewServiceFactoryImpl
import scala.collection.JavaConverters._
import java.io.File
import se.lu.nateko.cp.netcdf.viewing.DimensionsSpecification
import scala.collection.JavaConverters._

object Main extends App {

	implicit val system = ActorSystem("cpauth")
	implicit val timeout = Timeout(5 seconds)
	implicit val dispatcher = system.dispatcher

	//Production server
	val netCdfFolder: String = "/disk/data/common/netcdf/dataDemo/"

	//Local server
	//val netCdfFolder: String = "/disk/data/netcdf/"
	//val netCdfFolder: String = "/home/maintenance/workspace/"

	//Define lists of acceptable variable names
	val dates: java.util.List[String] = List("date", "time", "tstep").asJava
	val lats : java.util.List[String] = List("latitude", "lat").asJava
	val longs : java.util.List[String] = List("longitude", "lon").asJava
	val elevations : java.util.List[String] = List("nz").asJava
	
	val factory = new ViewServiceFactoryImpl(netCdfFolder, dates, lats, longs, elevations)
	
	val handler = system.actorOf(Props(new ServiceActor(factory)), name = "handler")
	
	IO(Http).ask(Http.Bind(handler, interface = "localhost", port = 9010))
		.onSuccess{ case _ =>
			sys.addShutdownHook{
				akka.io.IO(Http) ! akka.actor.PoisonPill
				Thread.sleep(1000)
				system.shutdown()
			}
		}

}
