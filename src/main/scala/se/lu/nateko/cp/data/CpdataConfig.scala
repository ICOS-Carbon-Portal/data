package se.lu.nateko.cp.data

import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import com.typesafe.config.ConfigRenderOptions

import java.net.URI

import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import se.lu.nateko.cp.meta.core.CommonJsonSupport
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.etcupload.StationId
import se.lu.nateko.cp.data.formats.netcdf.NetCdfViewServiceConfig
import spray.json.*
import eu.icoscp.envri.Envri
import eu.icoscp.geoipclient.{CpGeoConfig, CpGeoClient}
import se.lu.nateko.cp.cpauth.core.EmailConfig
import eu.icoscp.georestheart.RestHeartDBConfig
import eu.icoscp.georestheart.{RestHeartConfig => RHConfig}
import se.lu.nateko.cp.data.api.IpTest

case class AuthConfig(pub: Map[Envri, PublicAuthConfig], userSecretSalt: String)

case class NetCdfConfig(
	folder: String,
	dateVars: Seq[String],
	latitudeVars: Seq[String],
	longitudeVars: Seq[String],
	statsCalcParallelizm: Int
) extends NetCdfViewServiceConfig

case class B2SafeConfig(
	host: String,
	username: String,
	password: String,
	homePath: String,
	dryRun: Boolean
)

case class IRODSConfig(
	baseUrl: String,
	username: String,
	password: String,
	dryRun: Boolean
)

case class CredentialsConfig(username: String, password: String)

case class UploadConfig(
	folder: String,
	readonlyFolder: Option[String],
	b2safe: B2SafeConfig,
	irods: IRODSConfig,
	dlReporter: CredentialsConfig,
	admins: Seq[String]
)

case class PostgisConfig(
	hostname: String,
	dbNames: Map[Envri, String],
	port: Int,
	admin: CredentialsConfig,
	reader: CredentialsConfig,
	writer: CredentialsConfig,
	dbAccessPoolSize: Int,
	skipInit: Boolean,
	ipsToIgnore: Seq[String],
	grayDownloads: Seq[IpTest]
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
	base: RHConfig,
	userDownloadsLogLength: Int,
	portalUsage: RestheartCollDef
)

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
	postgis: PostgisConfig,
	etcFacade: EtcFacadeConfig,
	mailing: EmailConfig
)

object ConfigReader extends CommonJsonSupport{

	import se.lu.nateko.cp.meta.core.etcupload.JsonSupport.given
	import DefaultJsonProtocol.*

	given RootJsonFormat[NetCdfConfig] = jsonFormat5(NetCdfConfig.apply)
	given RootJsonFormat[B2SafeConfig] = jsonFormat5(B2SafeConfig.apply)
	given RootJsonFormat[CredentialsConfig] = jsonFormat2(CredentialsConfig.apply)
	given RootJsonFormat[IRODSConfig] = jsonFormat4(IRODSConfig.apply)
	given RootJsonFormat[UploadConfig] = jsonFormat6(UploadConfig.apply)
	given RootJsonFormat[MetaServiceConfig] = jsonFormat3(MetaServiceConfig.apply)
	given RootJsonFormat[PublicAuthConfig] = jsonFormat4(PublicAuthConfig.apply)
	given RootJsonFormat[IpTest] with
		override def write(obj: IpTest): JsValue = ??? //should not be needed
		override def read(json: JsValue): IpTest =
			val ipJs = json
				.asJsObject("Expected a JSON object describing IpTest")
				.fields
				.getOrElse("ip", deserializationError(s"Expected an 'ip' property in an IpTest JSON ${json.prettyPrint}"))
			ipJs match
				case JsString(ip) => IpTest.parse(ip)
				case _ => deserializationError(s"expected a JSON string for IpTest 'ip' property, got ${ipJs.prettyPrint}")


	given RootJsonFormat[Envri] = enumFormat(Envri.valueOf, Envri.values)

	given RootJsonFormat[MongoDbIndex] = jsonFormat3(MongoDbIndex.apply)
	given RootJsonFormat[MongoDbAggregations] = jsonFormat3(MongoDbAggregations.apply)
	given RootJsonFormat[RestheartCollDef] = jsonFormat4(RestheartCollDef.apply)
	given RootJsonFormat[PostgisConfig] = jsonFormat10(PostgisConfig.apply)
	given RootJsonFormat[EtcFacadeConfig] = jsonFormat4(EtcFacadeConfig.apply)
	given RootJsonFormat[AuthConfig] = jsonFormat2(AuthConfig.apply)
	import se.lu.nateko.cp.cpauth.core.JsonSupport.{given RootJsonFormat[EmailConfig]}
	given RootJsonFormat[RestHeartConfig] = jsonFormat3(RestHeartConfig.apply)
	given RootJsonFormat[CpdataConfig] = jsonFormat10(CpdataConfig.apply)

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
