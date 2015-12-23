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
import scala.concurrent.Future

object Playground {

	implicit val system = ActorSystem("playgr")
	implicit val materializer = ActorMaterializer(namePrefix = Some("playgr_mat"))
	implicit val blockingExeCtxt = system.dispatchers.lookup("akka.stream.default-blocking-io-dispatcher")

	val irodsConfig = ConfigReader.getDefault.upload.irods
	val client = new IrodsClient(irodsConfig)

	def repeat(str: String, n: Int) = Source(Iterable.fill(n)(ByteString(str)))
	def largeSrc = repeat("bebe meme!\n", 1000000)
	def smallSrc = repeat("bebe meme!\n", 5)
	def failing = Source.fromFuture(Future.failed(new Exception("I was born to fail!")))
	def failingLater = smallSrc.concat(failing)

	def uploadFile(path1: String, path2: String, src: Source[ByteString, Any]): Long = {

		val sink1 = client.getNewFileSink(path1)(blockingExeCtxt)
		val sink2 = client.getNewFileSink(path2)(blockingExeCtxt)
		val uploadedFut1 = src.runWith(sink1)
		val uploadedFut2 = src.runWith(sink2)
		uploadedFut1.onSuccess{case n => println(s"Run1: $n")}
		uploadedFut2.onSuccess{case n => println(s"Run2: $n")}
		Await.result(uploadedFut1, Duration.Inf) +
		Await.result(uploadedFut2, Duration.Inf)

	}

}













