package se.lu.nateko.cp.data.test.streams

import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.util.zip.ZipInputStream

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters
import akka.util.ByteString
import se.lu.nateko.cp.data.streams.ZipEntryFlow._
import se.lu.nateko.cp.data.test.TestUtils
import akka.NotUsed

class ZipEntryFlowTests extends AnyFunSuite with BeforeAndAfterAll{
	private implicit val system: ActorSystem = ActorSystem("ZipEntryFlowTests")

	override def afterAll(): Unit = {
		system.terminate()
	}

	def testUnZip(fileName: String, content: String, bySingleBytes: Boolean = false) = {
		val nameSuff = if(bySingleBytes) " (byte by byte)" else ""
		test("Unzipping " + fileName + nameSuff){
			val basicSrc = FileIO.fromPath(TestUtils.getFileInTarget(fileName).toPath)

			val src = if(bySingleBytes)
					basicSrc.flatMapConcat(Source.apply).map(b => ByteString(b))
				else
					basicSrc

			val unzippedFut = src.via(singleEntryUnzip).runFold(ByteString.empty)(_ ++ _)
			val unzipped = Await.result(unzippedFut, 2.seconds).utf8String

			assert(unzipped === content)
		}
	}

	def testUnzipLarge(largeFileBaseName: String, byByte: Boolean = false) =
		testUnZip(largeFileBaseName + ".zip", getFileContent(largeFileBaseName), byByte)

	def getFileContent(fileName: String): String = {
		val innerFile = TestUtils.getFileInTarget(fileName)
		new String(Files.readAllBytes(innerFile.toPath), StandardCharsets.UTF_8)
	}

	testUnzipLarge("26NA20050107_CO2_underway_SOCATv3.tab")
	testUnzipLarge("realatc.CO2")
	testUnzipLarge("realatc.CO2", true)
	testUnZip("emptyFile.txt.zip", "")
	testUnZip("blablaText.txt.zip", "blablaText\n")
	testUnZip("blablaText.txt.zip", "blablaText\n", true)

	def testRoundTrip(title: String, content: String) =
		test(s"Round-trip test ($title)"){
			val zipEntrySrc: Source[FileEntry, NotUsed] = Source(List(
				"theOnlyFile.txt" -> Source.single(ByteString(content))
			))
			val res = getMultiEntryZipStream(zipEntrySrc).via(singleEntryUnzip).runFold(ByteString.empty)(_ ++ _)
			val gotBack = Await.result(res, 2.seconds).utf8String
			assert(gotBack.length === content.length)
			assert(gotBack === content)
		}

	testRoundTrip("short string", "bla bla bla bebebe mememe")
	testRoundTrip("empty string", "")
	testRoundTrip("5 kb file realatc.CO2", getFileContent("realatc.CO2"))
	testRoundTrip("72 kb file 26NA20050107_CO2_underway_SOCATv3.tab", getFileContent("26NA20050107_CO2_underway_SOCATv3.tab"))

	test("Unzipping with Java streams"){
		val fut = StreamConverters.fromInputStream(
			() => {
				val zipStream = getClass.getResourceAsStream("/26NA20050107_CO2_underway_SOCATv3.tab.zip")
				val zs = new ZipInputStream(zipStream)
				zs.getNextEntry()
				zs
			}
		).runFold(ByteString.empty)(_ ++ _)
		val content = Await.result(fut, 2.seconds).utf8String
		assert(content.length === 72044)
	}
}
