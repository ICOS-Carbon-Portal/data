package se.lu.nateko.cp.data

import se.lu.nateko.cp.data.irods.IrodsClient
import akka.stream.scaladsl.Source
import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import scala.concurrent.Await
import scala.concurrent.duration.Duration
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.Http
import scala.concurrent.duration._
import akka.util.ByteString
import scala.collection.immutable.Iterable

object Playground {

	implicit val system = ActorSystem("playgr")
	implicit val materializer = ActorMaterializer(namePrefix = Some("playgr_mat"))

	def uploadFile(): Unit = {
		val irodsConfig = ConfigReader.getDefault.upload.irods
		val client = new IrodsClient(irodsConfig)

		val sink = client.getNewFileSink("test.txt")
		val source = Source(() => Iterator.fill(1000000)(ByteString("bebe meme!\n")))
		val uploadedFut = source.runWith(sink)
		Await.result(uploadedFut, Duration.Inf)

//		val out = client.getNewFileOutputStream("test.txt")
//		out.write("bebe".getBytes)
//		out.close()
	}

	def testUrl(url: String): Unit = {
		val request = HttpRequest(uri = url)//"https://epic.pdc.kth.se/v2/handles/11676"), headers = List(authorization, accept))
		val respFut = Http().singleRequest(request)
		val resp = Await.result(respFut, 10 second)
		println(resp)
	}

}