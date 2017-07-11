package se.lu.nateko.cp.data

import scala.collection.JavaConversions
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import scala.concurrent.ExecutionContext
import scala.util.Success
import scala.util.Failure
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
import se.lu.nateko.cp.data.api.RestHeartClient

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

	val http = Http()
	val metaClient = new MetaClient(config.meta)
	val restHeart = new RestHeartClient(config.restheart, http)

	val uploadService = new UploadService(config.upload, metaClient)

	val binTableFetcher = new FromBinTableFetcher(uploadService.folder)
	val tabularRouting = new TabularFetchRouting(binTableFetcher)

	val authRouting = new AuthRouting(config.auth)
	val uploadRouting = new UploadRouting(authRouting, uploadService, restHeart)

	val licenceRouting = new LicenceRouting(authRouting)
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
		licenceRouting.route ~
		EtcUploadRouting(config.etcFacade)
	}

	restHeart.init.flatMap{_ =>
		http.bindAndHandle(route, config.interface, 9010)
	}.onComplete{
		case Success(binding) =>
			sys.addShutdownHook{
				val exeCtxt = ExecutionContext.Implicits.global
				val doneFuture = binding
					.unbind()
					.flatMap(_ => system.terminate())(exeCtxt)
				Await.result(doneFuture, 3 seconds)
			}
			system.log.info(s"Started data: $binding")

		case Failure(err) =>
			system.log.error(err, "Could not start 'data' service")
			system.terminate()
	}

}
