package se.lu.nateko.cp.data.formats.netcdf

import spray.json.*

object NetCdfJson extends DefaultJsonProtocol:

	given RootJsonFormat[Stats] = jsonFormat2(Stats.apply)

	given RootJsonFormat[BoundingBox] = jsonFormat4(BoundingBox.apply)

	given RootJsonFormat[RasterMessage] = jsonFormat3(RasterMessage.apply)
