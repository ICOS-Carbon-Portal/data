package se.lu.nateko.cp.data.formats.netcdf

import spray.json._

object NetCdfJson extends DefaultJsonProtocol{

	implicit val statsFormat: RootJsonFormat[Stats] = jsonFormat2(Stats.apply)

	implicit val boundingBoxFormat: RootJsonFormat[BoundingBox] = jsonFormat4(BoundingBox.apply)

	implicit val rasterFormat: RootJsonFormat[RasterMessage] = jsonFormat3(RasterMessage.apply)
}
