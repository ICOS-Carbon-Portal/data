package se.lu.nateko.cp.data

import java.io.InputStream
import scala.collection.mutable.ArrayBuffer
import akka.http.scaladsl.model._
import MediaTypes._

object StaticResources {

	val carbonTrackerWidgetPage = getResponse("/carbontracker.html", `text/html`)
	val bundleScript = getResponse("/bundle.js", `application/javascript`)
	
	def getResponse(resourcePath: String, mediaType: MediaType): HttpResponse = {
		val stream = getClass.getResourceAsStream(resourcePath)

		if(stream == null) HttpResponse(status = StatusCodes.NotFound)
		else {
			val bytes = readAll(stream)
			HttpResponse(entity = HttpEntity(ContentType(mediaType), bytes))
		}
	}
	
	def readAll(stream: InputStream): Array[Byte] = {
		val bufferSize = 10000
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