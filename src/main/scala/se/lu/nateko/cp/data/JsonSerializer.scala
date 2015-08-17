package se.lu.nateko.cp.data

import se.lu.nateko.cp.netcdf.viewing.Raster
import spray.json._
import akka.http.scaladsl.model._

case class RasterMessage(stats: Stats, boundingBox: BoundingBox, array: Array[Array[Double]])
case class BoundingBox(latMin: Double, latMax: Double, lonMin: Double, lonMax: Double)
case class Stats(min: Double, max: Double)

object JsonSerializer extends DefaultJsonProtocol {

	implicit val statsFormat = jsonFormat2(Stats)
	implicit val boundingBoxFormat = jsonFormat4(BoundingBox)
	implicit val rasterFormat = jsonFormat3(RasterMessage)

	def toRasterMessage(raster: Raster) = {
		val stats = Stats(raster.getMin, raster.getMax)
		val box = BoundingBox(raster.getLatMin, raster.getLatMax, raster.getLonMin, raster.getLonMax)
		RasterMessage(stats, box, raster.to2DArray)
	}
	
}