package se.lu.nateko.cp.data

import se.lu.nateko.cp.netcdf.viewing.Raster
import spray.http._
import spray.json._

case class RasterMessage(min: Double, max: Double, array: Array[Array[Double]])

object JsonSerializer extends DefaultJsonProtocol {

	implicit val rasterFormat = jsonFormat3(RasterMessage)
	
	def toJson(raster: Raster): HttpResponse = {
		val msg = RasterMessage(raster.getMin, raster.getMax, raster.to2DArray)
		toResponse(msg.toJson)
	}
	
	def toResponse(array: Array[String]): HttpResponse = {
		toResponse(array.toJson)
	}
	
	def toResponse(json: JsValue): HttpResponse = {
		val jsonTxt = json.toJson.compactPrint

		val responseEntity = HttpEntity(ContentTypes.`application/json`, jsonTxt)

		HttpResponse(entity = responseEntity)
	}
}