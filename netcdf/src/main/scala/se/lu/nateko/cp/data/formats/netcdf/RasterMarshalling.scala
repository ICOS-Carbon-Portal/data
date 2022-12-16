package se.lu.nateko.cp.data.formats.netcdf

import java.nio.ByteBuffer
import java.nio.ByteOrder
import scala.concurrent.Future
import akka.http.scaladsl.marshalling.Marshaller
import akka.http.scaladsl.marshalling.Marshalling.WithFixedContentType
import akka.http.scaladsl.marshalling.ToResponseMarshaller
import akka.http.scaladsl.model.*
import akka.stream.scaladsl.Source
import akka.util.ByteString
import spray.json.*

case class RasterMessage(stats: Stats, boundingBox: BoundingBox, array: Array[Array[Double]])
case class Stats(min: Double, max: Double)

object RasterMarshalling {

	import NetCdfJson.given

	def marshaller: ToResponseMarshaller[Raster] = Marshaller(
		_ => raster => Future.successful(
			WithFixedContentType(ContentTypes.`application/json`, () => getJson(raster)) ::
			WithFixedContentType(ContentTypes.`application/octet-stream`, () => getBinary(raster)) :: Nil
		)
	)

	private def getJson(raster: Raster) = {
		val stats = Stats(raster.min, raster.max)
		val rasterMessage = RasterMessage(stats, raster.box, raster.to2DArray)

		HttpResponse(
			entity = HttpEntity(
				MediaTypes.`application/json`,
				rasterMessage.toJson.prettyPrint
			)
		)
	}

	private def getBinary(raster: Raster): HttpResponse = {
		val nLon = raster.sizeLon
		val nLat = raster.sizeLat

		def makeBuffer(size: Int) =
			ByteBuffer.allocate(size * 8).order(ByteOrder.BIG_ENDIAN)

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
		headerNums.put(nLat.toDouble)
		headerNums.put(nLon.toDouble)
		headerNums.put(raster.min)
		headerNums.put(raster.max)
		headerNums.put(raster.box.latMin)
		headerNums.put(raster.box.latMax)
		headerNums.put(raster.box.lonMin)
		headerNums.put(raster.box.lonMax)

		def rasterAsBinary: Iterator[ByteString] =
			Iterator.single(ByteString(headerBytes)) ++
			Iterator.range(0, nLat).map(rowAsBinary)

		val size = headerBytes.capacity + nLon * nLat * 8

		HttpResponse(
			entity = HttpEntity(
				MediaTypes.`application/octet-stream`.withComp(MediaType.Compressible),
				size.toLong,
				Source.fromIterator(() => rasterAsBinary)
			)
		)
	}
}
