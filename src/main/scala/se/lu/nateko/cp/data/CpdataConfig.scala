package se.lu.nateko.cp.data

import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import com.typesafe.config.ConfigRenderOptions

import java.net.URI

import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import se.lu.nateko.cp.meta.core.CommonJsonSupport
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.etcupload.StationId
import se.lu.nateko.cp.data.formats.netcdf.NetCdfViewServiceConfig
import spray.json.*

case class AuthConfig(pub: Map[Envri, PublicAuthConfig], userSecretSalt: String)

case class NetCdfConfig(
	folder: String,
	dateVars: Seq[String],
	latitudeVars: Seq[String],
	longitudeVars: Seq[String],
	elevationVars: Seq[String],
	statsCalcParallelizm: Int
) extends NetCdfViewServiceConfig

case class B2SafeConfig(
	host: String,
	username: String,
	password: String,
	homePath: String,
	dryRun: Boolean
)

case class CredentialsConfig(username: String, password: String)

case class UploadConfig(
	folder: String,
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
	activityLogUriBases: Map[Envri, URI],
	usersCollection: String,
	portalUsage: RestheartCollDef,
	skipInit: Boolean
){
	def dbName(using envri: Envri) = dbNames(envri)

	private def logUri(logType: String)(using envri: Envri): URI = {
		val baseUri = activityLogUriBases(envri)
		baseUri.resolve(logType)
	}

	def downloadLogUri(using Envri): URI = logUri("downloads")
	def portaluseLogUri(using Envri): URI = logUri("portaluse")
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
	auth: AuthConfig,
	netcdf: NetCdfConfig,
	upload: UploadConfig,
	meta: MetaServiceConfig,
	restheart: RestHeartConfig,
	downloads: DownloadStatsConfig,
	etcFacade: EtcFacadeConfig
)

object ConfigReader extends CommonJsonSupport{

	import se.lu.nateko.cp.meta.core.etcupload.JsonSupport.given
	import DefaultJsonProtocol.*

	given RootJsonFormat[NetCdfConfig] = jsonFormat6(NetCdfConfig.apply)
	given RootJsonFormat[B2SafeConfig] = jsonFormat5(B2SafeConfig.apply)
	given RootJsonFormat[CredentialsConfig] = jsonFormat2(CredentialsConfig.apply)
	given RootJsonFormat[UploadConfig] = jsonFormat4(UploadConfig.apply)
	given RootJsonFormat[MetaServiceConfig] = jsonFormat3(MetaServiceConfig.apply)
	given RootJsonFormat[PublicAuthConfig] = jsonFormat4(PublicAuthConfig.apply)

	given RootJsonFormat[Envri] = enumFormat(Envri.valueOf, Envri.values)

	given RootJsonFormat[MongoDbIndex] = jsonFormat3(MongoDbIndex.apply)
	given RootJsonFormat[MongoDbAggregations] = jsonFormat3(MongoDbAggregations.apply)
	given RootJsonFormat[RestheartCollDef] = jsonFormat4(RestheartCollDef.apply)
	given RootJsonFormat[RestHeartConfig] = jsonFormat6(RestHeartConfig.apply)
	given RootJsonFormat[DownloadStatsConfig] = jsonFormat8(DownloadStatsConfig.apply)
	given RootJsonFormat[EtcFacadeConfig] = jsonFormat4(EtcFacadeConfig.apply)
	given RootJsonFormat[AuthConfig] = jsonFormat2(AuthConfig.apply)
	given RootJsonFormat[CpdataConfig] = jsonFormat9(CpdataConfig.apply)

	val appConfig: Config = {
		val confFile = new java.io.File("application.conf").getAbsoluteFile
		if(!confFile.exists) ConfigFactory.load
		else
			ConfigFactory.parseFile(confFile)
				.withFallback(ConfigFactory.defaultApplication)
				.withFallback(ConfigFactory.defaultReferenceUnresolved)
				.resolve
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
