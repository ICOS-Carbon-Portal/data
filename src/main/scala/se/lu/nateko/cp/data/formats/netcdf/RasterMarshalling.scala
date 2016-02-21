package se.lu.nateko.cp.data.formats.netcdf

import java.nio.ByteBuffer
import java.nio.ByteOrder
import scala.concurrent.Future
import akka.http.scaladsl.marshalling.Marshaller
import akka.http.scaladsl.marshalling.Marshalling.WithFixedContentType
import akka.http.scaladsl.marshalling.ToResponseMarshaller
import akka.http.scaladsl.model._
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.CpdataJsonProtocol.rasterFormat
import se.lu.nateko.cp.data.formats.netcdf.viewing.Raster
import spray.json.pimpAny

case class RasterMessage(stats: Stats, boundingBox: BoundingBox, array: Array[Array[Double]])
case class BoundingBox(latMin: Double, latMax: Double, lonMin: Double, lonMax: Double)
case class Stats(min: Double, max: Double)

object RasterMarshalling {

	def marshaller: ToResponseMarshaller[Raster] = Marshaller(
		implicit exeCtxt => raster => Future.successful(
			WithFixedContentType(ContentTypes.`application/json`, () => getJson(raster)) ::
			WithFixedContentType(ContentTypes.`application/octet-stream`, () => getBinary(raster)) :: Nil
		)
	)

	private def getJson(raster: Raster) = {
		val stats = Stats(raster.getMin, raster.getMax)
		val box = BoundingBox(raster.getLatMin, raster.getLatMax, raster.getLonMin, raster.getLonMax)
		val rasterMessage = RasterMessage(stats, box, raster.to2DArray)

		HttpResponse(
			entity = HttpEntity(
				MediaTypes.`application/json`,
				rasterMessage.toJson.prettyPrint
			)
		)
	}

	private def getBinary(raster: Raster): HttpResponse = {
		val nLon = raster.getSizeLon
		val nLat = raster.getSizeLat

		def makeBuffer(size: Int) =
			ByteBuffer.allocate(size * 8).order(ByteOrder.LITTLE_ENDIAN)

		def rowAsBinary(lat: Int): ByteString = {
			val buffer = makeBuffer(nLon)
			val dblBuffer = buffer.asDoubleBuffer
			var lon = 0
			while(lon < nLon){
				dblBuffer.put(raster.get(lon, lat))
				lon += 1
			}
			ByteString(buffer)
		}

		val headerBytes = makeBuffer(8)
		val headerNums = headerBytes.asDoubleBuffer
		headerNums.put(nLat)
		headerNums.put(nLon)
		headerNums.put(raster.getMin)
		headerNums.put(raster.getMax)
		headerNums.put(raster.getLatMin)
		headerNums.put(raster.getLatMax)
		headerNums.put(raster.getLonMin)
		headerNums.put(raster.getLonMax)

		def rasterAsBinary: Iterator[ByteString] =
			Iterator.single(ByteString(headerBytes)) ++
			Iterator.range(0, nLat).map(rowAsBinary)

		val size = headerBytes.capacity + nLon * nLat * 8

		HttpResponse(
			entity = HttpEntity(
				MediaTypes.`application/octet-stream`.withComp(MediaType.Compressible),
				size,
				Source.fromIterator(() => rasterAsBinary)
			)
		)
	}
}
