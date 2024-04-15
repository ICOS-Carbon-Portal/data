package se.lu.nateko.cp.data.test.streams

import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.BeforeAndAfterAll
import akka.actor.ActorSystem
import se.lu.nateko.cp.data.streams.NetCdfValidator.assertFormat
import se.lu.nateko.cp.data.streams.NcResult.*
import akka.stream.scaladsl.FileIO
import se.lu.nateko.cp.data.test.TestUtils
import scala.concurrent.Await
import akka.stream.scaladsl.Source
import akka.util.ByteString

import scala.concurrent.duration.DurationInt
import se.lu.nateko.cp.data.streams.NcResult


class NcValidatorTests extends AnyFunSuite with BeforeAndAfterAll:
	private given system: ActorSystem = ActorSystem("ZipValidatorTests")
	val ncSink = assertFormat(NoData, Invalid)(using system.dispatcher)

	override def afterAll(): Unit =
		system.terminate()

	def testFile(
		testName: String, inputFile: String, expectedType: NcResult
	): Unit = test(testName) {
		val source = FileIO.fromPath(TestUtils.getFileInTarget(inputFile).toPath)
		val res = Await.result(source.runWith(ncSink), 2.seconds)

		assert(res === expectedType)
	}

	testFile("Valid nc file", "GCP2019_regions_MASK11_ext.nc", NcResult.Valid)
	testFile("Valid nc file 2", "GCP2019_regions_MASK11.nc", NcResult.Valid)
	testFile("Valid HDF file", "amazon_mask.nc", NcResult.Valid)
	testFile("Invalid nc file", "fluxnet_hh.csv", NcResult.Invalid)

	test("No data") {
		val source = Source(Seq(ByteString.empty))
		val res = Await.result(source.runWith(ncSink), 2.seconds)

		assert(res === NcResult.NoData)
	}


