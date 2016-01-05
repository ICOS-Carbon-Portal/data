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
import se.lu.nateko.cp.data.api.Sha256Sum
import akka.stream.scaladsl.FileIO

object Playground {

	implicit val system = ActorSystem("playgr")
	implicit val materializer = ActorMaterializer(namePrefix = Some("playgr_mat"))
	implicit val blockingExeCtxt = system.dispatchers.lookup("akka.stream.default-blocking-io-dispatcher")

	val irodsConfig = ConfigReader.getDefault.upload.irods
	val client = new IrodsClient(irodsConfig)

	def repeat(str: String, n: Int) = {
		val bs = ByteString(str)
		Source.fromIterator(() => Iterator.fill(n)(bs))
//			.via(Flow[ByteString].throttle(100, 1 second, 2, ThrottleMode.Shaping))
	}

	val row = Iterator.fill(10)("bebe meme").mkString("", "\t", "\n")
	val rowBlock = Iterator.fill(100)(row).mkString("", "", "\n")

	def largeSrc = repeat(rowBlock, 1000)
	def smallSrc = repeat(rowBlock, 5)

	def failing = Source.fromFuture(Future.failed(new Exception("I was born to fail!")))
	def failingLater = smallSrc.concat(failing)

	def uploadFile(path: String, src: Source[ByteString, Any]): Future[Sha256Sum] = {
		val sink = client.getNewFileSink(path)(blockingExeCtxt)
		src.runWith(sink)
	}

	def fromDisk(path: String): Future[Sha256Sum] = {
		val file = new java.io.File(path)
		val src = FileIO.fromFile(file)
		val sink = client.getNewFileSink(file.getName)(blockingExeCtxt)
		src.runWith(sink)
	}

	def writeZeros(path: String): Unit = {
		val out = client.getNewFileOutputStream(path)
		val arr = Array.ofDim[Byte](100000000)
		(1 to 1).foreach(_ => out.write(arr))
		out.close()
	}

	def errorTest: Future[Int] = {
		val disrupted = Source(1 to 3).concat(failing)
		val summer = Sink.fold[Int, Int](0)((sum, next) => if(next > 2) throw new Exception("sink failure!") else sum + next)

		val runnable = disrupted.toMat(summer)(Keep.right)
		runnable.run()
	}

}













