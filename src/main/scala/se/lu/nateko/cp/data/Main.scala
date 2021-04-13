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
import akka.stream.Materializer
import se.lu.nateko.cp.cpdata.BuildInfo
import se.lu.nateko.cp.data.routes._
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.api.PortalLogClient
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.data.formats.netcdf.NetcdfUtil
import se.lu.nateko.cp.data.services.dlstats.PostgresDlLog
import se.lu.nateko.cp.data.services.fetch.FromBinTableFetcher
import se.lu.nateko.cp.data.services.fetch.IntegrityControlService
import se.lu.nateko.cp.data.services.upload.UploadService

object Main extends App {

	implicit val system = ActorSystem("cpdata", config = Some(ConfigReader.appConfig))
	system.log
	implicit val dispatcher = system.dispatcher

	val config = ConfigReader.getDefault
	implicit val envriConfigs = ConfigReader.metaCore.envriConfigs

	private val netcdfUtil = new NetcdfUtil(config.netcdf)

	val http = Http()
	val metaClient = new MetaClient(config.meta)
	val restHeart = new RestHeartClient(config.restheart, http)
	val portalLog = new PortalLogClient(config.restheart, http)

	val uploadService = new UploadService(config.upload, config.netcdf, metaClient)
	val integrityService = new IntegrityControlService(uploadService)

	val netcdfRoute = NetcdfRoute.cp(netcdfUtil.serviceFactory(uploadService.folder.getAbsolutePath + "/netcdf/"))
	val legacyNetcdfRoute = NetcdfRoute(netcdfUtil.serviceFactory(config.netcdf.folder))

	val binTableFetcher = new FromBinTableFetcher(uploadService.folder)
	val tabularRoute = new TabularFetchRouting(binTableFetcher).route

	val authRouting = new AuthRouting(config.auth)
	val uploadRoute = new UploadRouting(authRouting, uploadService, ConfigReader.metaCore).route
	val postgresLog = new PostgresDlLog(config.downloads, system.log)
	val downloadRouting = new DownloadRouting(authRouting, uploadService, restHeart, portalLog, postgresLog, ConfigReader.metaCore)
	val csvRouting = new CsvFetchRouting(uploadService, restHeart, authRouting)
	val integrityRoute = new IntegrityRouting(authRouting, config.upload).route(integrityService)

	val licenceRoute = new LicenceRouting(authRouting.userOpt, ConfigReader.metaCore.handleProxies).route
	val staticRoute = new StaticRouting(config.auth).route
	val etcUploadRoute = new EtcUploadRouting(authRouting, config.etcFacade, uploadService).route

	val statsRoute = new StatsRouting(postgresLog, ConfigReader.metaCore)

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
		pathEndOrSingleSlash{
			downloadRouting.extractEnvri{envri =>
				val urlHash = if(envri == Envri.ICOS) """#{"filterCategories"%3A{"project"%3A["icos"]%2C"level"%3A[2]}}""" else ""
				redirect(s"/portal/$urlHash", StatusCodes.Found)
			}
		} ~
		netcdfRoute ~
		legacyNetcdfRoute ~
		csvRouting.route ~
		downloadRouting.route ~
		uploadRoute ~
		tabularRoute ~
		statsRoute.route ~
		staticRoute ~
		licenceRoute ~
		etcUploadRoute ~
		authRouting.whoami ~
		authRouting.logout ~
		path("buildInfo"){complete(BuildInfo.toString)} ~
		integrityRoute ~
		complete(StatusCodes.NotFound -> "Your request did not match any service")
	}

	restHeart.init.zip(postgresLog.initLogTables()).flatMap{_ =>
		http.newServerAt(config.interface, config.port).bind(route)
	}.onComplete{
		case Success(binding) =>
			sys.addShutdownHook{
				val exeCtxt = ExecutionContext.Implicits.global
				val doneFuture = binding
					.unbind()
					.flatMap(_ => system.terminate())(exeCtxt)
				try{
					Await.result(doneFuture, 3 seconds)
				} finally{
					postgresLog.close()
				}
			}
			system.log.info(s"Started data: $binding")

		case Failure(err) =>
			system.log.error(err, "Could not start 'data' service")
			system.terminate()
			postgresLog.close()
	}

}
