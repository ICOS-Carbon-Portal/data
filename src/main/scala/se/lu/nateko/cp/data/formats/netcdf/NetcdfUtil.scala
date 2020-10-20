package se.lu.nateko.cp.data.formats.netcdf

import java.nio.file.Path
import scala.jdk.CollectionConverters.SeqHasAsJava
import se.lu.nateko.cp.data.NetCdfConfig
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.ViewServiceFactoryImpl
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.NetCdfViewServiceImpl

class NetcdfUtil(config: NetCdfConfig) {
	import config._

	def serviceFactory(folderPath: String) =
		new ViewServiceFactoryImpl(folderPath, dateVars.asJava, latitudeVars.asJava, longitudeVars.asJava, elevationVars.asJava)

	def service(file: Path) =
		new NetCdfViewServiceImpl(file.toAbsolutePath.toString, dateVars.asJava, latitudeVars.asJava, longitudeVars.asJava, elevationVars.asJava)

}
