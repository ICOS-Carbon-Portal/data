package se.lu.nateko.cp.data

import se.lu.nateko.cp.data.irods.IrodsClient
import akka.stream.scaladsl.Source
import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.util.ByteString
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.FileIO
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.services.etcfacade.AuthenticatorProvider
import se.lu.nateko.cp.meta.core.etcupload.StationId
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.HttpRequest
import java.nio.file.Paths

object Playground {

	implicit val system = ActorSystem("playgr")
	implicit val blockingExeCtxt = system.dispatchers.lookup("akka.stream.default-blocking-io-dispatcher")

	val config = ConfigReader.getDefault
	val irodsConfig = config.upload.irods2.copy(dryRun = false)
	val client = IrodsClient(irodsConfig)

	def repeat(str: String, n: Int) = {
		val bs = ByteString(str)
		Source.fromIterator(() => Iterator.fill(n)(bs))
//			.via(Flow[ByteString].throttle(100, 1 second, 2, ThrottleMode.Shaping))
	}

	val row = Iterator.fill(10)("bebe meme").mkString("", "\t", "\n")
	val rowBlock = Iterator.fill(100)(row).mkString("", "", "\n")

	def largeSrc = repeat(rowBlock, 1000)
	def smallSrc = repeat(rowBlock, 5)

	def failing = Source.failed(new Exception("I was born to fail!"))
	def failingLater = smallSrc.concat(failing)

	def uploadToPath(path: String, src: Source[ByteString, Any]): Future[Sha256Sum] = {
		val sink = client.getNewFileSink(path)(blockingExeCtxt)
		src.runWith(sink)
	}

	def upload(fromPath: String, toRelIrodsPath: String): Future[Sha256Sum] = {
		val src = FileIO.fromPath(Paths.get(fromPath))
		val sink = client.getNewFileSink(toRelIrodsPath)(blockingExeCtxt)
		src.runWith(sink)
	}

	def digestFileFromDisk(path: String): Future[Sha256Sum] = {
		val file = new java.io.File(path)
		val src = FileIO.fromPath(file.toPath)
		val sink = DigestFlow.sha256.to(Sink.ignore)
		src.runWith(sink)
	}


	def writeParallel(prefix: String, n: Int): Future[Seq[Sha256Sum]] = {
		val extraLargeSrc = repeat(rowBlock, 10000)
		val futsFut = Future.traverse(0 to n)(i => Future{uploadToPath(s"$prefix$i.txt", extraLargeSrc)})
		futsFut.flatMap(futs => Future.sequence(futs))
	}

	def errorTest: Future[Int] = {
		val disrupted = Source(1 to 3).concat(failing)
		val summer = Sink.fold[Int, Int](0)((sum, next) => if(next > 2) throw new Exception("sink failure!") else sum + next)

		val runnable = disrupted.toMat(summer)(Keep.right)
		runnable.run()
	}

	def getPassword(stationId: String, secret: String = ""): Option[String] = {
		val etcConfig = if(secret.isEmpty)
			config.etcFacade
		else
			config.etcFacade.copy(secret = secret)
		StationId.unapply(stationId).map(AuthenticatorProvider.getPassword(_, etcConfig))
	}

	def manualHostTest(host: String): Unit = {
		import akka.http.scaladsl.model.headers
		Http().singleRequest(HttpRequest(
			uri = "http://127.0.0.1:9094/objects/r9PLBPgCVDkIGQ-pVHpd1PH-",
			headers = headers.Host(host) :: Nil
//			headers = headers.Host("meta.fieldsites.se") :: Nil
		)).flatMap(_.entity.toStrict(2.seconds)).foreach{entity =>
			println(entity.data.utf8String)
		}
	}
}
