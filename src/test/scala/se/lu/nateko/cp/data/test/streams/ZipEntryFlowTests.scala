package se.lu.nateko.cp.data.test.streams

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

import org.scalatest.BeforeAndAfterAll
import org.scalatest.FunSuite

import akka.NotUsed
import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.streams.ZipEntryFlow._

class ZipEntryFlowTests extends FunSuite with BeforeAndAfterAll{
	private implicit val system = ActorSystem("ZipEntryFlowTests")
	private implicit val materializer = ActorMaterializer()

	override def afterAll(): Unit = {
		system.terminate()
	}

	test("Round-trip test"){

		val content = "bla bla bla bebebe mememe"

		val zipEntrySrc: Source[FileEntry, NotUsed] = Source(List(
			"theOnlyFile.txt" -> Source.single(ByteString(content))
		))

		val res = getMultiEntryZipStream(zipEntrySrc).via(singleEntryUnzip).runFold(ByteString.empty)(_ ++ _)
		val gotBack = Await.result(res, 2.seconds).utf8String
		assert(gotBack === content)
	}
}