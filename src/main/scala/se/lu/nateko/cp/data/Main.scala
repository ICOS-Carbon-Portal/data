package se.lu.nateko.cp.data

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.ExceptionHandler
import se.lu.nateko.cp.cpdata.BuildInfo
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.api.PortalLogClient
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.formats.netcdf.ViewServiceFactory
import se.lu.nateko.cp.data.routes.*
import se.lu.nateko.cp.data.services.dlstats.PostgresDlLog
import se.lu.nateko.cp.data.services.fetch.FromBinTableFetcher
import se.lu.nateko.cp.data.services.fetch.IntegrityControlService
import se.lu.nateko.cp.data.services.upload.DownloadService
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.EnvriConfig

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success
import java.nio.file.Path

object Main extends App {

	given system: ActorSystem = ActorSystem("cpdata", config = Some(ConfigReader.appConfig))
	system.log
	import system.dispatcher

	val config = ConfigReader.getDefault
	given Map[Envri,EnvriConfig] = ConfigReader.metaCore.envriConfigs

	val http = Http()
	val metaClient = new MetaClient(config.meta)
	val restHeart = new RestHeartClient(config.restheart, http)
	val portalLog = new PortalLogClient(config.restheart, http, system.log)

	val uploadService = new UploadService(config.upload, config.netcdf, metaClient)
	val integrityService = new IntegrityControlService(uploadService)

	val netcdfRouting = NetcdfRoutes(
		uploadService.folder.toPath.resolve("netcdf/"),
		Path.of(config.netcdf.folder),
		config.netcdf
	)

	val authRouting = new AuthRouting(config.auth)
	val uploadRoute = new UploadRouting(authRouting, uploadService, ConfigReader.metaCore).route
	val postgresLog = new PostgresDlLog(config.downloads, system.log)

	val downloadService = new DownloadService(ConfigReader.metaCore, uploadService, restHeart)
	val downloadRouting = new DownloadRouting(authRouting, downloadService, portalLog, postgresLog, ConfigReader.metaCore)
	val csvRouting = new CsvFetchRouting(uploadService, restHeart, portalLog, authRouting)

	val binTableFetcher = new FromBinTableFetcher(uploadService.folder)
	val tabularRoute = new CpbFetchRouting(binTableFetcher, restHeart, portalLog, authRouting).route

	val zipRoute = new ZipRouting(downloadService, restHeart, portalLog, authRouting).route

	val integrityRoute = new IntegrityRouting(authRouting, config.upload).route(integrityService)

	val licenceRoute = new LicenceRouting(authRouting.userOpt, ConfigReader.metaCore.handleProxies).route
	val staticRoute = new StaticRouting().route
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
			downloadRouting.extractEnvri{envri ?=>
				val urlHash = if(envri == Envri.ICOS)
					"""#{"filterCategories"%3A{"project"%3A["icos"]%2C"level"%3A[1%2C2]%2C"stationclass"%3A["ICOS"]}}"""
				else ""
				redirect(s"/portal/$urlHash", StatusCodes.Found)
			}
		} ~
		netcdfRouting.dataObjects ~
		netcdfRouting.dataDemo ~
		csvRouting.route ~
		downloadRouting.route ~
		uploadRoute ~
		tabularRoute ~
		zipRoute ~
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
				try{
					Await.result(binding.unbind(), 3.seconds)
					println("'data' service has been successfully taken offline")
				} finally{
					postgresLog.close()
					println("Postgres data object downloads log has been closed")
				}
				println("'data' service shutdown successful")
			}
			system.log.info(s"Started data: $binding")

		case Failure(err) =>
			system.log.error(err, "Could not start 'data' service")
			system.terminate()
			postgresLog.close()
	}

}
