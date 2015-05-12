package se.lu.nateko.cp.data

import spray.http._
import MediaTypes._
import java.io.InputStream
import scala.collection.mutable.ArrayBuffer

object StaticResources {

	val carbonTrackerWidgetPage = getResponse("/carbontracker.html", `text/html`)
	val carbonTrackerScript = getResponse("/carbontracker.js", `application/javascript`)
	val dataFetcherScript = getResponse("/datafetcher.js", `application/javascript`)

	def getResponse(resourcePath: String, mediaType: MediaType): HttpResponse = {
		val stream = getClass.getResourceAsStream(resourcePath)
		val bytes = readAll(stream)
		HttpResponse(entity = HttpEntity(ContentType(mediaType), bytes))
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