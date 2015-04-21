package se.lu.nateko.cp.data

import se.lu.nateko.cp.netcdf.viewing.Raster
import spray.http._
import spray.json._
import DefaultJsonProtocol._

object RasterSerializer {

	def toJson(raster: Raster): HttpResponse = {
		val json = raster.to2DArray.toJson.compactPrint
		val responseEntity = HttpEntity(ContentTypes.`application/json`, json)
		HttpResponse(entity = responseEntity)
	}
}