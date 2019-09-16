package se.lu.nateko.cp.data.test.formats.atcprod

import java.io.File

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

import org.scalatest.BeforeAndAfterAll
import org.scalatest.FunSuite

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl._
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.atcprod.AtcProdStreams._
import se.lu.nateko.cp.data.formats.bintable._

class AtcProdStreamsTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system: ActorSystem = ActorSystem("atccsvstreamstest")
	private implicit val materializer: ActorMaterializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		Await.ready(system.terminate(), 3.seconds)
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)

	val formats = ColumnsMetaWithTsCol(
		new ColumnsMeta(Seq(
			PlainColumn(Iso8601DateTime, "TIMESTAMP", isOptional = false),
			PlainColumn(FloatValue, "co2", isOptional = false),
			PlainColumn(FloatValue, "Stdev", isOptional = false)
		)),
		"TIMESTAMP"
	)

	private val rowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/ICOS_ATC_NRT_GAT_2018-04-12CO2.csv"))
		.via(TimeSeriesStreams.linesFromUtf8Binary)
		.via(atcProdParser(formats))

	val binTableSink = BinTableSink(outFile("/atcCsvBinTest.cpb"), overwrite = true)

	test("Parsing of an example ATC product time series data set"){

		val rowsFut = rowsSource.runWith(Sink.seq)
		val rows = Await.result(rowsFut, 3.second)

		assert(rows.size === 24)
		assert(rows(2).cells(0) === "2018-04-12T02:00:00Z") //stick-test
		assert(rows(2).cells(8) === "2018.27694064") //stick-test
	}

	test("Null value gets replaced by an empty string") {
		val rowsFut = rowsSource.runWith(Sink.seq)
		val rows = Await.result(rowsFut, 3.second)

		assert(rows(23).cells(9) === "")
	}

	test("Parsing of an example ATC product time series data set and streaming to BinTable"){
		val converter = new TimeSeriesToBinTableConverter(formats.colsMeta)
		val g = rowsSource
			.wireTapMat(Sink.head[TableRow])(_ zip _)
			.map(converter.parseRow)
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 3.second)

		assert(readResult.count === 5007)
		assert(nRowsWritten === 24)
		assert(formats.colsMeta.plainCols.keySet.diff(firstRow.header.columnNames.toSet) === Set())

	}

}
