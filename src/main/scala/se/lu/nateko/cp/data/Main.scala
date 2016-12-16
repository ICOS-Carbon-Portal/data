package se.lu.nateko.cp.data

import scala.collection.JavaConversions
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import scala.concurrent.ExecutionContext
import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.ExceptionHandler
import akka.http.scaladsl.server.RouteResult.route2HandlerFlow
import akka.stream.ActorMaterializer
import se.lu.nateko.cp.data.irods.IrodsClient
import se.lu.nateko.cp.data.routes._
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.ViewServiceFactoryImpl
import se.lu.nateko.cp.data.irods.IRODSConnectionPool
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.services.fetch.FromBinTableFetcher
import se.lu.nateko.cp.data.services.fetch.StiltResultsFetcher

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

	val metaClient = new MetaClient(config.meta)

	val uploadService = new UploadService(config.upload, metaClient)

	val binTableFetcher = new FromBinTableFetcher(uploadService.folder)
	val tabularRouting = new TabularFetchRouting(binTableFetcher)

	val authRouting = new AuthRouting(config.auth)
	val uploadRouting = new UploadRouting(authRouting, uploadService)

	val stiltFetcher = new StiltResultsFetcher(config.stilt, config.netcdf)

	val exceptionHandler = ExceptionHandler{
		case ex =>
			val traceWriter = new java.io.StringWriter()
			ex.printStackTrace(new java.io.PrintWriter(traceWriter))
			val trace = traceWriter.toString
			val exMsg = ex.getMessage
			val msg = if(exMsg == null || exMsg.isEmpty) ex.getClass.getName else exMsg
			complete((StatusCodes.InternalServerError, s"$msg\n$trace"))
	}

	val route = handleExceptions(exceptionHandler){
		NetcdfRoute(factory) ~
		uploadRouting.route ~
		tabularRouting.route ~
		StiltRouting(stiltFetcher) ~
		StaticRouting.route ~
		EtcUploadRouting()
	}

	Http()
		.bindAndHandle(route, config.interface, 9010)
		.onSuccess{
			case binding =>
				sys.addShutdownHook{
					val exeCtxt = ExecutionContext.Implicits.global
					val doneFuture = binding
						.unbind()
						.flatMap(_ => system.terminate())(exeCtxt)
					Await.result(doneFuture, 3 seconds)
				}
				println(binding)
		}

}
