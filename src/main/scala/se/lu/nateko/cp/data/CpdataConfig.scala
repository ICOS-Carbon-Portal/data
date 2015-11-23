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

case class UploadConfig(folder: String)
case class CpdataConfig(auth: PublicAuthConfig, netcdf: NetCdfConfig, upload: UploadConfig)

object ConfigReader extends DefaultJsonProtocol{

	implicit val uploadConfigFormat = jsonFormat1(UploadConfig)
	implicit val pubAuthConfigFormat = jsonFormat2(PublicAuthConfig)
	implicit val netcdfConfigFormat = jsonFormat5(NetCdfConfig)
	implicit val cpdataConfigFormat = jsonFormat3(CpdataConfig)

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