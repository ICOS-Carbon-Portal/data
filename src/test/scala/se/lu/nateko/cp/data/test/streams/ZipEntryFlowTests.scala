package se.lu.nateko.cp.data.test.streams

import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.util.zip.ZipInputStream

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

import org.scalatest.BeforeAndAfterAll
import org.scalatest.FunSuite

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters
import akka.util.ByteString
import se.lu.nateko.cp.data.streams.ZipEntryFlow._
import se.lu.nateko.cp.data.test.TestUtils

class ZipEntryFlowTests extends FunSuite with BeforeAndAfterAll{
	private implicit val system = ActorSystem("ZipEntryFlowTests")
	private implicit val materializer = ActorMaterializer()

	override def afterAll(): Unit = {
		system.terminate()
	}

	def testZip(fileName: String, content: String, bySingleBytes: Boolean = false) = {
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

	val largeContent = {
		val innerFile = TestUtils.getFileInTarget("26NA20050107_CO2_underway_SOCATv3.tab")
		new String(Files.readAllBytes(innerFile.toPath), StandardCharsets.UTF_8)
	}

	testZip("26NA20050107_CO2_underway_SOCATv3.tab.zip", largeContent)
	testZip("emptyFile.txt.zip", "")
	testZip("blablaText.txt.zip", "blablaText\n")
	testZip("blablaText.txt.zip", "blablaText\n", true)

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
