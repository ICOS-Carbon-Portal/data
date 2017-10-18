package se.lu.nateko.cp.data

import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import spray.json._
import com.typesafe.config.Config
import com.typesafe.config.ConfigRenderOptions
import com.typesafe.config.ConfigFactory
import se.lu.nateko.cp.meta.core.MetaCoreConfig

case class NetCdfConfig(
	folder: String,
	dateVars: Seq[String],
	latitudeVars: Seq[String],
	longitudeVars: Seq[String],
	elevationVars: Seq[String]
)

case class IrodsConfig(
	host: String,
	port: Int,
	username: String,
	password: String,
	homeDirectory: String,
	zone: String,
	defaultResource: String,
	dryRun: Boolean
)
case class UploadConfig(folder: String, irods: IrodsConfig)

case class MetaServiceConfig(
	baseUrl: String,
	sparqlEndpointPath: String,
	uploadApiPath: String
)

case class StiltConfig(mainFolder: String)

case class RestHeartConfig(
	baseUri: String,
	dbName: String,
	usersCollection: String,
	portalUsageCollection: String,
	dobjDownloadsCollection: String,
	dobjDownloadsAggregations: JsObject
)

case class EtcFacadeConfig(folder: String, secret: String, stationOverrides: Map[String, String])

case class CpdataConfig(
	interface: String,
	auth: PublicAuthConfig,
	netcdf: NetCdfConfig,
	upload: UploadConfig,
	meta: MetaServiceConfig,
	stilt: StiltConfig,
	restheart: RestHeartConfig,
	etcFacade: EtcFacadeConfig
)

object ConfigReader extends DefaultJsonProtocol{

	implicit val netcdfConfigFormat = jsonFormat5(NetCdfConfig)
	implicit val irodsConfigFormat = jsonFormat8(IrodsConfig)
	implicit val uploadConfigFormat = jsonFormat2(UploadConfig)
	implicit val sparqlConfigFormat = jsonFormat3(MetaServiceConfig)
	implicit val pubAuthConfigFormat = jsonFormat4(PublicAuthConfig)
	implicit val stiltConfigFormat = jsonFormat1(StiltConfig)
	implicit val restHeartConfigFormat = jsonFormat6(RestHeartConfig)
	implicit val etcFacadeConfigFormat = jsonFormat3(EtcFacadeConfig)
	implicit val cpdataConfigFormat = jsonFormat8(CpdataConfig)

	val appConfig: Config = {
		val default = ConfigFactory.load
		val confFile = new java.io.File("application.conf").getAbsoluteFile
		if(!confFile.exists) default
		else ConfigFactory.parseFile(confFile).withFallback(default)
	}

	def getDefault: CpdataConfig = fromAppConfig(appConfig)

	private val renderOpts = ConfigRenderOptions.concise.setJson(true)

	private def fromAppConfig(applicationConfig: Config): CpdataConfig = {
		val confJson: String = applicationConfig.getValue("cpdata").render(renderOpts)
		
		confJson.parseJson.convertTo[CpdataConfig]
	}

	val metaCore: MetaCoreConfig = {
		val default = ConfigFactory.parseResources("metacore.conf")
		appConfig.withFallback(default).getValue("metacore").render(renderOpts)
			.parseJson.convertTo[MetaCoreConfig]
	}
}

object HardConfig{
	val ioDispatcher = "akka.io.pinned-dispatcher"
}
