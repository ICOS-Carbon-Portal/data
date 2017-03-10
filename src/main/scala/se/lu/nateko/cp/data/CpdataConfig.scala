package se.lu.nateko.cp.data

import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import spray.json._
import com.typesafe.config.Config
import com.typesafe.config.ConfigRenderOptions
import com.typesafe.config.ConfigFactory

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
	defaultResource: String
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
	dobjDownloadsCollection: String
)

case class CpdataConfig(
	interface: String,
	auth: PublicAuthConfig,
	netcdf: NetCdfConfig,
	upload: UploadConfig,
	meta: MetaServiceConfig,
	stilt: StiltConfig,
	restheart: RestHeartConfig
)

object ConfigReader extends DefaultJsonProtocol{

	implicit val netcdfConfigFormat = jsonFormat5(NetCdfConfig)
	implicit val irodsConfigFormat = jsonFormat7(IrodsConfig)
	implicit val uploadConfigFormat = jsonFormat2(UploadConfig)
	implicit val sparqlConfigFormat = jsonFormat3(MetaServiceConfig)
	implicit val pubAuthConfigFormat = jsonFormat2(PublicAuthConfig)
	implicit val stiltConfigFormat = jsonFormat1(StiltConfig)
	implicit val restHeartConfigFormat = jsonFormat4(RestHeartConfig)
	implicit val cpdataConfigFormat = jsonFormat7(CpdataConfig)

	def getDefault: CpdataConfig = fromAppConfig(getAppConfig)

	def getAppConfig: Config = {
		val default = ConfigFactory.load
		val confFile = new java.io.File("application.conf").getAbsoluteFile
		if(!confFile.exists) default
		else ConfigFactory.parseFile(confFile).withFallback(default)
	}

	def fromAppConfig(applicationConfig: Config): CpdataConfig = {
		val renderOpts = ConfigRenderOptions.concise.setJson(true)
		val confJson: String = applicationConfig.getValue("cpdata").render(renderOpts)
		
		confJson.parseJson.convertTo[CpdataConfig]
	}
}

object HardConfig{
	val ioDispatcher = "akka.io.pinned-dispatcher"
}
