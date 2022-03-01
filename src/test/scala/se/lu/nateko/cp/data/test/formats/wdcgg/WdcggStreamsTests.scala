package se.lu.nateko.cp.data.test.formats.wdcgg

import java.io.File

import akka.actor.ActorSystem
import akka.stream.{Materializer, IOResult}
import akka.stream.scaladsl._
import akka.util.ByteString
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.wdcgg.WdcggStreams._

import scala.concurrent.duration.DurationInt
import scala.concurrent.{Await, Future}

class WdcggStreamsTests extends AnyFunSuite with BeforeAndAfterAll{

	private implicit val system: ActorSystem = ActorSystem("wdcggstreamstest")
	import system.dispatcher

	override def afterAll(): Unit = {
		Await.ready(system.terminate(), 3.seconds)
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)
	val expectedNRows = 360

	val formats = ColumnsMetaWithTsCol(
		new ColumnsMeta(Seq(
			PlainColumn(Iso8601Date, "DATE", isOptional = false),
			PlainColumn(Iso8601DateTime, "TIMESTAMP", isOptional = false),
			PlainColumn(Iso8601TimeOfDay, "TIME", isOptional = false),
			PlainColumn(FloatValue, "PARAMETER", isOptional = false),
			PlainColumn(FloatValue, "ND", isOptional = false),
			PlainColumn(FloatValue, "SD", isOptional = false)
		)),
		"TIMESTAMP"
	)

	val linesSource: Source[String, Future[IOResult]] = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/ams137s00.lsce.as.cn.co2.nl.mo.dat"))
		.via(linesFromBinary)
	val rowsSource: Source[TableRow, Future[IOResult]] = linesSource.via(wdcggParser(formats))

	val converter = new TimeSeriesToBinTableConverter(formats.colsMeta)
	val binTableSink = BinTableSink(outFile("/wdcggBinTest.cpb"), true)

	test("Parsing of an example WDCGG time series data set"){
		val rowsFut = rowsSource.runWith(Sink.seq)
		val rows = Await.result(rowsFut, 1.second)

		assert(rows.size === rows.head.header.nRows)
		assert(rows.size === expectedNRows)
	}

	test("Parsing and writing of an example WDCGG time series data set"){
		val binTableExport: RunnableGraph[Future[(IOResult, Long)]] = rowsSource
			.map(converter.parseRow)
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
			.wireTapMat(Sink.head[TableRow])(_ zip _)
			.map(converter.parseRow)
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 1.second)

		assert(readResult.count === 29454)
		assert(firstRow.header.nRows === expectedNRows)
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
		val kv = Await.result(linesSource.runWith(wdcggHeaderSink(formats.colsMeta)), 1.second)

		assert(kv("PARAMETER") === "CO2")
		assert(kv("TIME INTERVAL") === "monthly")
		assert(kv("CREDIT FOR USE").endsWith("used within a publication.\""))
		assert(kv("COMMENT") === "")
	}

}