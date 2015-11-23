package se.lu.nateko.cp.data

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Directives._
import akka.stream.ActorMaterializer
import scala.concurrent.Await
import scala.concurrent.duration._
import se.lu.nateko.cp.netcdf.viewing.impl.ViewServiceFactoryImpl
import se.lu.nateko.cp.data.routes._
import se.lu.nateko.cp.data.services.FileStorageService
import akka.http.scaladsl.server.ExceptionHandler
import akka.http.scaladsl.model.StatusCodes

object Main extends App {

	implicit val system = ActorSystem("cpdata")
	implicit val materializer = ActorMaterializer(namePrefix = Some("cpdata_mat"))
	implicit val dispatcher = system.dispatcher

	val config = ConfigReader.getDefault

	val factory = {
		import config.netcdf._
		import scala.collection.JavaConversions._
		new ViewServiceFactoryImpl(folder, dateVars, latitudeVars, longitudeVars, elevationVars)
	}

	val fileService = new FileStorageService(new java.io.File(config.upload.folder))
	val authRouting = new AuthRouting(config.auth)
	val fileRouting = new FileRouting(authRouting, fileService)

	val exceptionHandler = ExceptionHandler{
		case ex =>
			val exMsg = ex.getMessage
			val msg = if(exMsg == null || exMsg.isEmpty) ex.getClass.getName else exMsg
			complete((StatusCodes.InternalServerError, msg))
	}

	val route = handleExceptions(exceptionHandler){
		NetcdfRoute(factory) ~
		fileRouting.route
	}

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
