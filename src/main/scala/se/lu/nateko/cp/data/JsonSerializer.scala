package se.lu.nateko.cp.data

import se.lu.nateko.cp.netcdf.viewing.Raster
import spray.http._
import spray.json._

case class RasterMessage(stats: Stats, boundingBox: BoundingBox, array: Array[Array[Double]])
case class BoundingBox(latMin: Double, latMax: Double, lonMin: Double, lonMax: Double)
case class Stats(min: Double, max: Double)

object JsonSerializer extends DefaultJsonProtocol {

	implicit val statsFormat = jsonFormat2(Stats)
	implicit val boundingBoxFormat = jsonFormat4(BoundingBox)
	implicit val rasterFormat = jsonFormat3(RasterMessage)

	def toJson(raster: Raster): HttpResponse = {
		val stats = Stats(raster.getMin, raster.getMax)
		val box = BoundingBox(raster.getLatMin, raster.getLatMax, raster.getLonMin, raster.getLonMax)
		val msg = RasterMessage(stats, box, raster.to2DArray)
		toResponse(msg.toJson)
	}
	
	def toResponse(array: Array[String]): HttpResponse = {
		toResponse(array.toJson)
	}
	
	def toResponse(json: JsValue): HttpResponse = {
		val jsonTxt = json.compactPrint

		val responseEntity = HttpEntity(ContentTypes.`application/json`, jsonTxt)

		HttpResponse(entity = responseEntity)
	}
}