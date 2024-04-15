package se.lu.nateko.cp.data.test.streams

import akka.actor.ActorSystem
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Source
import akka.util.ByteString
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.streams.NetCdfValidator
import se.lu.nateko.cp.data.streams.NetCdfValidator.*
import se.lu.nateko.cp.data.test.TestUtils

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt


class NcValidatorTests extends AnyFunSuite with BeforeAndAfterAll:
	import NetCdfValidator.Result.*

	private given system: ActorSystem = ActorSystem("ZipValidatorTests")
	val ncSink = assertFormat(using system.dispatcher)

	override def afterAll(): Unit =
		system.terminate()

	def testFile(
		testName: String, inputFile: String, expectedType: Result
	): Unit = test(testName) {
		val source = FileIO.fromPath(TestUtils.getFileInTarget(inputFile).toPath)
		val res = Await.result(source.runWith(ncSink), 2.seconds)

		assert(res === expectedType)
	}

	testFile("Valid nc file", "GCP2019_regions_MASK11_ext.nc", Valid)
	testFile("Valid nc file 2", "GCP2019_regions_MASK11.nc", Valid)
	testFile("Valid HDF file", "amazon_mask.nc", Valid)
	testFile("Invalid nc file", "fluxnet_hh.csv", Invalid)

	test("No data") {
		val source = Source(Seq(ByteString.empty))
		val res = Await.result(source.runWith(ncSink), 2.seconds)

		assert(res === NoData)
	}


