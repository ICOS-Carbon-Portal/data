package se.lu.nateko.cp.data

import se.lu.nateko.cp.data.irods.IrodsClient
import akka.stream.scaladsl.Source
import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.util.ByteString
import scala.concurrent.Future
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.FileIO
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.services.etcfacade.AuthenticatorProvider
import se.lu.nateko.cp.data.services.etcfacade.StationId

object Playground {

	implicit val system = ActorSystem("playgr")
	implicit val materializer = ActorMaterializer(namePrefix = Some("playgr_mat"))
	implicit val blockingExeCtxt = system.dispatchers.lookup("akka.stream.default-blocking-io-dispatcher")

	val config = ConfigReader.getDefault
	val irodsConfig = config.upload.irods
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

	def failing = Source.fromFuture(Future.failed(new Exception("I was born to fail!")))
	def failingLater = smallSrc.concat(failing)

	def uploadFile(path: String, src: Source[ByteString, Any]): Future[Sha256Sum] = {
		val sink = client.getNewFileSink(path)(blockingExeCtxt)
		src.runWith(sink)
	}

	def fromDisk(path: String): Future[Sha256Sum] = {
		val file = new java.io.File(path)
		val src = FileIO.fromPath(file.toPath)
		val sink = client.getNewFileSink(file.getName)(blockingExeCtxt)
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
		val futsFut = Future.traverse(0 to n)(i => Future{uploadFile(s"$prefix$i.txt", extraLargeSrc)})
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
		StationId.unapply(stationId).map(AuthenticatorProvider.getSecret(_, etcConfig))
	}
}
