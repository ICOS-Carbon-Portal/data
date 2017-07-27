package se.lu.nateko.cp.data.test.formats.wdcgg

import akka.actor.ActorSystem
import akka.stream.{ClosedShape, ActorMaterializer}
import akka.stream.IOResult
import akka.stream.scaladsl._
import akka.util.ByteString
import java.io.File
import org.scalatest.FunSuite
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.wdcgg.WdcggStreams._
import org.scalatest.BeforeAndAfterAll
import se.lu.nateko.cp.data.formats.wdcgg.WdcggRow
import scala.concurrent.{Future, Await}
import scala.concurrent.duration.DurationInt

class WdcggStreamsTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system = ActorSystem("wdcggstreamstest")
	private implicit val materializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		system.terminate()
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)
	val expectedNRows = 360

	val formats = Map(
		"DATE" -> Iso8601Date,
		"TIMESTAMP" -> Iso8601DateTime,
		"TIME" -> Iso8601TimeOfDay,
		"PARAMETER" -> FloatValue,
		"ND" -> IntValue,
		"SD" -> FloatValue
	)

	val linesSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/ams137s00.lsce.as.cn.co2.nl.mo.dat"))
		.via(linesFromBinary)
	val rowsSource = linesSource.via(wdcggParser)

	val binTableSink = BinTableSink(outFile("/wdcggBinTest.cpb"), true)

	test("Parsing of an example WDCGG time series data set"){

		val rowsFut = rowsSource.runWith(Sink.seq)

		val rows = Await.result(rowsFut, 1.second)

		assert(rows.size === rows.head.header.nRows)
		assert(rows.size === expectedNRows)
	}

	test("Parsing and writing of an example WDCGG time series data set"){

		val binTableExport: RunnableGraph[Future[(IOResult, Long)]] = rowsSource
			.via(wdcggToBinTableConverter(formats))
			.toMat(binTableSink)(_ zip _)

		val rowCountsFut = rowsSource.runFold[(Int, Int)]((0, 0)){
			case ((0, _), firstRow) => (firstRow.header.nRows, 1)
			case ( (schemaNRows, count), _) => (schemaNRows, count + 1)
		}

		val (schemaNRows, nRowsInSource) = Await.result(rowCountsFut, 1.second)

		val (readResult, nRowsWritten) = Await.result(binTableExport.run(), 1.second)

		assert(schemaNRows === nRowsInSource)
		assert(nRowsWritten === nRowsInSource)
		assert(nRowsWritten === expectedNRows)
		assert(readResult.count === 29454)
	}

	test("Parsing (single pass) and writing using 'alsoToMat' of an example WDCGG time series data set"){

		val g = rowsSource
			.alsoToMat(Sink.head[WdcggRow])(_ zip _)
			.via(wdcggToBinTableConverter(formats))
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 1.second)

		assert(readResult.count === 29454)
		assert(firstRow.header.nRows === expectedNRows)
		assert(nRowsWritten === expectedNRows)

	}

	test("Parsing (single pass) and writing using broadcast of an example WDCGG time series data set"){

		val g = RunnableGraph.fromGraph(GraphDSL.create(Sink.head[Int], binTableSink)(
			(_ zip _)
		) { implicit builder =>
			(schemaNRowsSinkShape, binTableSinkShape) =>
				import GraphDSL.Implicits._

				val bCast = builder.add(Broadcast[WdcggRow](2))
				rowsSource ~> bCast

				bCast ~> Flow[WdcggRow].map(_.header.nRows) ~> schemaNRowsSinkShape.in
				bCast ~> wdcggToBinTableConverter(formats) ~> binTableSinkShape

				ClosedShape
		})

		val (schemaNRows, nRowsWritten) = Await.result(g.run(), 1.second)

		assert(schemaNRows === expectedNRows)
		assert(nRowsWritten === expectedNRows)
	}

	test("linesFromBinary Flow handles Unix style new lines correctly"){
		val binSource = Source.apply(
			ByteString("first line\n") ::
					ByteString(" second\n") ::
					ByteString("third \n") ::
					ByteString(" forth \n") ::
					ByteString("fi\rfth\n") :: Nil
		)
		val lines: Seq[String] = Await.result(binSource.via(linesFromBinary).runWith(Sink.seq), 1.second)
		assert(lines === Seq("first line", " second", "third ", " forth ", "fifth"))
	}

	test("linesFromBinary Flow handles Windows style new lines correctly"){
		val strLines = List("first line\r\n", " second\r\n", "third \r\n", " forth \r\n", "fi\rfth\r\n")
		val binSource = Source(strLines).map(ByteString(_))

		val lines: Seq[String] = Await.result(binSource.via(linesFromBinary).runWith(Sink.seq), 1.second)
		assert(lines === Seq("first line", " second", "third ", " forth ", "fifth"))
	}

	test("Header key-values are parsed successfully"){
		val kv = Await.result(linesSource.runWith(wdcggHeaderSink), 1.second)

		assert(kv("PARAMETER") === "CO2")
		assert(kv("TIME INTERVAL") === "monthly")
		assert(kv("CREDIT FOR USE").endsWith("used within a publication.\""))
		assert(kv("COMMENT") === "")
	}

}