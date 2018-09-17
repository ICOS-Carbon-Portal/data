package se.lu.nateko.cp.data

import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import com.typesafe.config.ConfigRenderOptions

import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import se.lu.nateko.cp.meta.core.CommonJsonSupport
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.etcupload.StationId
import spray.json._

case class NetCdfConfig(
	folder: String,
	dateVars: Seq[String],
	latitudeVars: Seq[String],
	longitudeVars: Seq[String],
	elevationVars: Seq[String]
)

case class B2StageConfig(
	host: String,
	username: String,
	password: String
)

case class IrodsConfig(
	host: String,
	port: Int,
	username: String,
	password: String,
	homeDirectory: String,
	zone: String,
	defaultResource: String,
	authenticationScheme: Option[String],
	dryRun: Boolean
)
case class UploadConfig(folder: String, irods: IrodsConfig, irods2: IrodsConfig, b2stage: B2StageConfig)

case class MetaServiceConfig(
	baseUrl: String,
	sparqlEndpointPath: String,
	uploadApiPath: String
)

case class StiltConfig(mainFolder: String)

case class RestHeartConfig(
	baseUri: String,
	dbNames: Map[Envri, String],
	dobjDownloadLogUris: Map[Envri, java.net.URI],
	usersCollection: String,
	portalUsageCollection: String,
	dobjDownloadsCollection: String,
	dobjDownloadsAggregations: JsObject
){
	def dbName(implicit envri: Envri) = dbNames(envri)
	def dobjDownloadLogUri(implicit envri: Envri) = dobjDownloadLogUris(envri)
}

case class EtcFacadeConfig(
	folder: String,
	secret: String,
	stationOverrides: Map[StationId, String],
	testStation: StationId
)

case class CpdataConfig(
	interface: String,
	auth: Map[Envri, PublicAuthConfig],
	netcdf: NetCdfConfig,
	upload: UploadConfig,
	meta: MetaServiceConfig,
	stilt: StiltConfig,
	restheart: RestHeartConfig,
	etcFacade: EtcFacadeConfig
)

object ConfigReader extends CommonJsonSupport{

	import se.lu.nateko.cp.meta.core.etcupload.JsonSupport.stationIdFormat

	implicit val netcdfConfigFormat = jsonFormat5(NetCdfConfig)
	implicit val irodsConfigFormat = jsonFormat9(IrodsConfig)
	implicit val b2stageConfigFormat = jsonFormat3(B2StageConfig)
	implicit val uploadConfigFormat = jsonFormat4(UploadConfig)
	implicit val sparqlConfigFormat = jsonFormat3(MetaServiceConfig)
	implicit val pubAuthConfigFormat = jsonFormat4(PublicAuthConfig)
	implicit val stiltConfigFormat = jsonFormat1(StiltConfig)

	implicit val envriFormat = enumFormat(Envri)

	implicit val restHeartConfigFormat = jsonFormat7(RestHeartConfig)
	implicit val etcFacadeConfigFormat = jsonFormat4(EtcFacadeConfig)
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
