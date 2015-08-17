package se.lu.nateko.cp.data

import java.io.InputStream
import scala.collection.mutable.ArrayBuffer
import akka.http.scaladsl.model._
import MediaTypes._

object StaticResources {

	private val bufferSize = 8192

	val netcdfWidgetPage = getResponse("/netcdf.html", `text/html`)
	val bundleScript = getResponse("/bundle.js", `application/javascript`)

	def getResponse(resourcePath: String, mediaType: MediaType): HttpResponse = {
		val stream = getClass.getResourceAsStream(resourcePath)

		if(stream == null) HttpResponse(status = StatusCodes.NotFound)
		else HttpResponse(entity = HttpEntity(ContentType(mediaType), readAll(stream)))
	}

	def readAll(stream: InputStream): Array[Byte] = {
		val acc = ArrayBuffer[Byte]()
		val buffer = Array.ofDim[Byte](bufferSize)

		var hasRead = 0
		do{
			hasRead = stream.read(buffer)
			acc ++= buffer.take(hasRead)
		}while(hasRead == bufferSize)

		val res = acc.toArray
		stream.close()
		res
	}
}