package se.lu.nateko.cp.data.test.streams

import akka.actor.ActorSystem
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Source
import akka.util.ByteString
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.streams.ZipValidator.*
import se.lu.nateko.cp.data.streams.ZipResult.*
import se.lu.nateko.cp.data.test.TestUtils

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import se.lu.nateko.cp.data.streams.ZipResult

class ZipValidatorTests extends AnyFunSuite with BeforeAndAfterAll:
	private given system: ActorSystem = ActorSystem("ZipValidatorTests")
	val zipSink = assertFormat(NoData, Invalid)(using system.dispatcher)

	override def afterAll(): Unit =
		system.terminate()

	def testFile(
		testName: String, inputFile: String, expectedType: ZipResult
	): Unit = test(testName) {
		val source = FileIO.fromPath(TestUtils.getFileInTarget(inputFile).toPath)
		val res = Await.result(source.runWith(zipSink), 2.seconds)

		assert(res === expectedType)
	}

	testFile("Valid zip file", "blablaText.txt.zip", ZipResult.Valid)
	testFile("Empty zip file", "empty.zip", ZipResult.EmptyZip)
	testFile("Invalid zip file", "fluxnet_hh.csv", ZipResult.Invalid)
	testFile("Spanned zip file", "spanned.zip", ZipResult.SpannedZip)

	test("No data") {
		val source = Source(Seq(ByteString.empty))
		val res = Await.result(source.runWith(zipSink), 2.seconds)

		assert(res === ZipResult.NoData)
	}

	test("Sparse stream"){
		val byteStrings = Vector(
			ByteString.empty,
			ByteString(0x50),
			ByteString.empty,
			ByteString(0x4B),
			ByteString.empty,
			ByteString(0x03),
			ByteString.empty,
			ByteString(0x04)
		)
		val source = Source(byteStrings)
		val res = Await.result(source.runWith(zipSink), 2.seconds)

		assert(res === ZipResult.Valid)
	}
