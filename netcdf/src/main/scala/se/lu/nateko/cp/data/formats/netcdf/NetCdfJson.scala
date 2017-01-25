package se.lu.nateko.cp.data.formats.netcdf

import spray.json.DefaultJsonProtocol

object NetCdfJson extends DefaultJsonProtocol{

	implicit val statsFormat = jsonFormat2(Stats)

	implicit val boundingBoxFormat = jsonFormat4(BoundingBox)

	implicit val rasterFormat = jsonFormat3(RasterMessage)
}
