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
import se.lu.nateko.cp.data.formats.atcprod.AtcProdRow
import se.lu.nateko.cp.data.formats.atcprod.AtcProdStreams._
import se.lu.nateko.cp.data.formats.bintable._

class AtcProdStreamsTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system = ActorSystem("atccsvstreamstest")
	private implicit val materializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		system.terminate()
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)

	val formats = ColumnFormats(
		Map(
			"TIMESTAMP" -> Iso8601DateTime,
			"co2" -> FloatValue,
			"Stdev" -> FloatValue
		),
		"TIMESTAMP"
	)

	val rowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/ICOS_ATC_NRT_GAT_2018-04-12CO2.csv"))
		.via(TimeSeriesStreams.linesFromBinary)
		.via(atcProdParser)

	val binTableSink = BinTableSink(outFile("/atcCsvBinTest.cpb"), true)

	test("Parsing of an example ATC product time series data set"){

		val rowsFut = rowsSource.runWith(Sink.seq)

		val rows = Await.result(rowsFut, 3.second)

		assert(rows.size === 24)
		assert(rows(2).cells(7) === "2018.27694064") //stick-test
	}

	test("Parsing of an example ATC product time series data set and streaming to BinTable"){

		val g = rowsSource
			.wireTapMat(Sink.head[AtcProdRow])(_ zip _)
			.via(atcProdToBinTableConverter(formats))
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 3.second)

		assert(readResult.count === 5006)
		assert(nRowsWritten === 24)
		assert(formats.valueFormats.keySet.diff(firstRow.header.columnNames.toSet) === Set("TIMESTAMP"))

	}

}
