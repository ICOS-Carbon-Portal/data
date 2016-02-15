package se.lu.nateko.cp.data

import spray.json._
import se.lu.nateko.cp.data.formats.netcdf.RasterMessage
import se.lu.nateko.cp.data.formats.netcdf.BoundingBox
import se.lu.nateko.cp.data.formats.netcdf.Stats

object CpdataJsonProtocol extends DefaultJsonProtocol {

	implicit val statsFormat = jsonFormat2(Stats)
	implicit val boundingBoxFormat = jsonFormat4(BoundingBox)
	implicit val rasterFormat = jsonFormat3(RasterMessage)

}
