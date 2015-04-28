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


object Main extends App {

	implicit val system = ActorSystem("cpauth")
	implicit val timeout = Timeout(5 seconds)
	implicit val dispatcher = system.dispatcher

//	val factoryDef: Map[String, ServiceSpecification] = Map(
//		"service1" -> new ServiceSpecification(
//			new File("/home/paul/Downloads/NetCDF/yearly_1x1_fluxes.nc"),
//			"fossil_flux_imp",
//			
//			new DimensionsSpecification(
//				"date", "latitude", "longitude"
//			)
//		)
//	)
	
	val factory = new ViewServiceFactoryImpl()
	
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
