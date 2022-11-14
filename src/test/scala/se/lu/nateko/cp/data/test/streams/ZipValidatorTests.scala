package se.lu.nateko.cp.data.test.streams

import akka.actor.ActorSystem
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Source
import akka.util.ByteString
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.streams.ZipValidator.*
import se.lu.nateko.cp.data.test.TestUtils

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class ZipValidatorTests extends AnyFunSuite with BeforeAndAfterAll:
	private given system: ActorSystem = ActorSystem("ZipValidatorTests")
	val zipSink = assertZipFormat(using system.dispatcher)

	override def afterAll(): Unit =
		system.terminate()

	def testFile(
		testName: String, inputFile: String, expectedType: Result
	): Unit = test(testName) {
		val source = FileIO.fromPath(TestUtils.getFileInTarget(inputFile).toPath)
		val res = Await.result(source.runWith(zipSink), 2.seconds)

		assert(res === expectedType)
	}

	testFile("Valid zip file", "blablaText.txt.zip", Result.Valid)
	testFile("Empty zip file", "empty.zip", Result.EmptyZip)
	testFile("Invalid zip file", "fluxnet_hh.csv", Result.Invalid)
	testFile("Spanned zip file", "spanned.zip", Result.SpannedZip)

	test("No data") {
		val source = Source(Seq(ByteString.empty))
		val res = Await.result(source.runWith(zipSink), 2.seconds)

		assert(res === Result.NoData)
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

		assert(res === Result.Valid)
	}
