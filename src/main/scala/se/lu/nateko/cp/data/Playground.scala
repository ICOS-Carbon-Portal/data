package se.lu.nateko.cp.data

import se.lu.nateko.cp.data.irods.IrodsClient
import akka.stream.scaladsl.Source
import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import scala.concurrent.Await
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.Http
import scala.concurrent.duration._
import akka.util.ByteString
import scala.collection.immutable.Iterable
import scala.concurrent.Future
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Flow
import akka.stream.ThrottleMode

object Playground {

	implicit val system = ActorSystem("playgr")
	implicit val materializer = ActorMaterializer(namePrefix = Some("playgr_mat"))
	implicit val blockingExeCtxt = system.dispatchers.lookup("akka.stream.default-blocking-io-dispatcher")

	val irodsConfig = ConfigReader.getDefault.upload.irods
	val client = new IrodsClient(irodsConfig)

	def repeat(str: String, n: Int) = {
		val bs = ByteString(str)
		Source.fromIterator(() => Iterator.fill(n)(bs))
//			.via(Flow[ByteString].throttle(1000, 1 second, 1, ThrottleMode.Shaping))
	}
	def largeSrc = repeat("bebe meme\n", 1000000)
	def smallSrc = repeat("bebe meme\n", 5)
	def failing = Source.fromFuture(Future.failed(new Exception("I was born to fail!")))
	def failingLater = smallSrc.concat(failing)

	def uploadFile(path1: String, src: Source[ByteString, Any]): Future[Long] = {
		val sink1 = client.getNewFileSink(path1)(blockingExeCtxt)
		src.runWith(sink1)
	}

	def errorTest: Future[Int] = {
		val disrupted = Source(1 to 3).concat(failing)
		val summer = Sink.fold[Int, Int](0)((sum, next) => if(next > 2) throw new Exception("sink failure!") else sum + next)

		val runnable = disrupted.toMat(summer)(Keep.right)
		runnable.run()
	}

}













