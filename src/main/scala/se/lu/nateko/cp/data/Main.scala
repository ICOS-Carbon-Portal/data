package se.lu.nateko.cp.data

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
import se.lu.nateko.cp.data.routes._
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.ViewServiceFactoryImpl
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.services.fetch.FromBinTableFetcher
import se.lu.nateko.cp.data.services.fetch.StiltResultsFetcher
import se.lu.nateko.cp.data.api.RestHeartClient

object Main extends App {

	implicit val system = ActorSystem("cpdata")
	system.log
	implicit val materializer = ActorMaterializer(namePrefix = Some("cpdata_mat"))
	implicit val dispatcher = system.dispatcher

	val config = ConfigReader.getDefault
	implicit val envriConfigs = ConfigReader.metaCore.envriConfigs

	private def netCdfServiceFactory(netCdfFolder: String) = {
		import config.netcdf._
		import scala.collection.JavaConverters._
		new ViewServiceFactoryImpl(netCdfFolder, dateVars.asJava, latitudeVars.asJava, longitudeVars.asJava, elevationVars.asJava)
	}

	val http = Http()
	val metaClient = new MetaClient(config.meta)
	val restHeart = new RestHeartClient(config.restheart, http)

	val uploadService = new UploadService(config.upload, metaClient)

	val netcdfRoute = NetcdfRoute.cp(netCdfServiceFactory(uploadService.folder.getAbsolutePath + "/netcdf/"))
	val legacyNetcdfRoute = NetcdfRoute(netCdfServiceFactory(config.netcdf.folder))

	val binTableFetcher = new FromBinTableFetcher(uploadService.folder)
	val tabularRoute = new TabularFetchRouting(binTableFetcher).route

	val authRouting = new AuthRouting(config.auth)
	val uploadRoute = new UploadRouting(authRouting, uploadService, restHeart, ConfigReader.metaCore).route

	val licenceRoute = new LicenceRouting(authRouting).route
	val stiltRoute = StiltRouting(new StiltResultsFetcher(config.stilt, config.netcdf))
	val staticRoute = StaticRouting.route
	val etcUploadRoute = new EtcUploadRouting(authRouting, config.etcFacade, uploadService).route

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
		netcdfRoute ~
		legacyNetcdfRoute ~
		uploadRoute ~
		tabularRoute ~
		stiltRoute ~
		staticRoute ~
		licenceRoute ~
		etcUploadRoute ~
		authRouting.whoami ~
		authRouting.logout
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
