package se.lu.nateko.cp.data

import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import com.typesafe.config.ConfigRenderOptions

import java.net.URI

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

case class B2SafeConfig(
	host: String,
	username: String,
	password: String,
	homePath: String,
	dryRun: Boolean
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

case class CredentialsConfig(username: String, password: String)

case class UploadConfig(
	folder: String,
	irods: IrodsConfig,
	irods2: IrodsConfig,
	b2safe: B2SafeConfig,
	dlReporter: CredentialsConfig,
	admins: Seq[String]
)

case class DownloadStatsConfig(
	hostname: String,
	dbNames: Map[Envri, String],
	port: Int,
	admin: CredentialsConfig,
	reader: CredentialsConfig,
	writer: CredentialsConfig,
	dbAccessPoolSize: Int,
	skipInit: Boolean
)

case class MetaServiceConfig(
	baseUrl: String,
	sparqlEndpointPath: String,
	uploadApiPath: String
)

case class MongoDbIndex(name: String, keys: JsObject, ops: Option[JsObject])
case class MongoDbAggregations(definitions: JsObject, cached: Seq[String], cacheValidityInMinutes: Int)
case class RestheartCollDef(
  name: String,
  description: String,
  indices: Option[Seq[MongoDbIndex]],
  aggregations: Option[MongoDbAggregations]
)

case class RestHeartConfig(
	baseUri: String,
	dbNames: Map[Envri, String],
	downloadLogUris: Map[Envri, URI],
	usersCollection: String,
	portalUsage: RestheartCollDef,
	dobjDownloads: RestheartCollDef,
	collDownloads: RestheartCollDef,
	skipInit: Boolean
){
	def dbName(implicit envri: Envri) = dbNames(envri)

	def downloadLogUri(implicit envri: Envri): URI = {
		val baseUri = downloadLogUris(envri)
		baseUri.resolve("downloads")
	}
}

case class EtcFacadeConfig(
	folder: String,
	secret: String,
	stationOverrides: Map[StationId, String],
	testStation: StationId
)

case class CpdataConfig(
	interface: String,
	port: Int,
	auth: Map[Envri, PublicAuthConfig],
	netcdf: NetCdfConfig,
	upload: UploadConfig,
	meta: MetaServiceConfig,
	restheart: RestHeartConfig,
	downloads: DownloadStatsConfig,
	etcFacade: EtcFacadeConfig
)

object ConfigReader extends CommonJsonSupport{

	import se.lu.nateko.cp.meta.core.etcupload.JsonSupport.stationIdFormat

	implicit val netcdfConfigFormat = jsonFormat5(NetCdfConfig)
	implicit val irodsConfigFormat = jsonFormat9(IrodsConfig)
	implicit val b2stageConfigFormat = jsonFormat5(B2SafeConfig)
	implicit val credentialsConfigFormat = jsonFormat2(CredentialsConfig)
	implicit val uploadConfigFormat = jsonFormat6(UploadConfig)
	implicit val sparqlConfigFormat = jsonFormat3(MetaServiceConfig)
	implicit val pubAuthConfigFormat = jsonFormat4(PublicAuthConfig)

	implicit val envriFormat = enumFormat(Envri)

	implicit val mongoDbIndexFormat = jsonFormat3(MongoDbIndex)
	implicit val mongoDbAggregationsFormat = jsonFormat3(MongoDbAggregations)
	implicit val restheartCollDefFormat = jsonFormat4(RestheartCollDef)
	implicit val restHeartConfigFormat = jsonFormat8(RestHeartConfig)
	implicit val dlStatsConfigFormat = jsonFormat8(DownloadStatsConfig)
	implicit val etcFacadeConfigFormat = jsonFormat4(EtcFacadeConfig)
	implicit val cpdataConfigFormat = jsonFormat9(CpdataConfig)

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
