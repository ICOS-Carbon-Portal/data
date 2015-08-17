package se.lu.nateko.cp.data

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl._
import akka.http.scaladsl.Http

import scala.collection.JavaConverters._
import scala.collection.JavaConverters._
import scala.concurrent.Future
import scala.concurrent.Await
import scala.concurrent.duration._

import se.lu.nateko.cp.netcdf.viewing.ViewServiceFactory
import se.lu.nateko.cp.netcdf.viewing.ServiceSpecification
import se.lu.nateko.cp.netcdf.viewing.impl.ViewServiceFactoryImpl
import se.lu.nateko.cp.netcdf.viewing.DimensionsSpecification

object Main extends App {

	implicit val system = ActorSystem("cpauth")
	implicit val materializer = ActorMaterializer()
	implicit val dispatcher = system.dispatcher
	//implicit val timeout = Timeout(5 seconds)

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
	
	val handler = new RequestHandler(factory)

	val serverSource: Source[Http.IncomingConnection, Future[Http.ServerBinding]] =
		Http().bind(interface = "localhost", port = 9010)

	val bindingFuture = serverSource.to(Sink.foreach{
		connection => connection.handleWithSyncHandler(handler)
	}).run()

	bindingFuture.onSuccess{ case binding =>
			sys.addShutdownHook{
				val doneFuture = binding.unbind().andThen{case _ => system.shutdown()}
				Await.result(doneFuture, 3 seconds)
			}
		}

}
