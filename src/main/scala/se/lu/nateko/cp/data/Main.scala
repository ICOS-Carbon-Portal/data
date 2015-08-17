package se.lu.nateko.cp.data

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl._
import akka.http.scaladsl.Http

import scala.collection.JavaConverters._
import scala.concurrent.Future
import scala.concurrent.Await
import scala.concurrent.duration._

import se.lu.nateko.cp.netcdf.viewing.impl.ViewServiceFactoryImpl

object Main extends App {

	implicit val system = ActorSystem("cpdata")
	implicit val materializer = ActorMaterializer(namePrefix = Some("cpdata_mat"))
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
	
	val route = DataRoute(factory)

	Http()
		.bindAndHandle(route, "localhost", 9010)
		.onSuccess{
			case binding =>
				sys.addShutdownHook{
					val doneFuture = binding.unbind().andThen{
						case _ => system.shutdown()
					}
					Await.result(doneFuture, 3 seconds)
				}
				println(binding)
		}

}
