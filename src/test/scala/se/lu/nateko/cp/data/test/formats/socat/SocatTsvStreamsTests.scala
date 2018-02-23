package se.lu.nateko.cp.data.test.formats.socat

import java.io.File

import scala.concurrent.{ Future, Await }
import scala.concurrent.duration.DurationInt

import org.scalatest.BeforeAndAfterAll
import org.scalatest.FunSuite

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl._
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.socat.SocatTsvRow
import se.lu.nateko.cp.data.formats.socat.SocatTsvStreams._

class SocatTsvStreamsTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system = ActorSystem("socattsvstreamstest")
	private implicit val materializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		system.terminate()
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)
	val nRows = 526

	val formats = ColumnFormats(
		Map(
			"TIMESTAMP" -> Iso8601DateTime,
			"Latitude" -> DoubleValue,
			"Longitude" -> DoubleValue,
			"Depth water [m]" -> FloatValue,
			"Temp [°C]" -> FloatValue,
			"fCO2water_SST_wet [µatm] (Recomputed after SOCAT (Pfeil...)" -> FloatValue
		),
		"TIMESTAMP"
	)

	val rowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/26NA20050107_CO2_underway_SOCATv3.tab"))
		.via(TimeSeriesStreams.linesFromBinary)
		.via(socatTsvParser)

	val binTableSink = BinTableSink(outFile("/socatTsvBinTest.cpb"), true)

	test("Parsing of an example Socat time series data set"){

		val rowsFut = rowsSource.runWith(Sink.seq)

		val rows = Await.result(rowsFut, 1.second)

		assert(rows.size === nRows)
		assert(rows(2).cells(2) === "-42.94501") //stick-test
	}

	test("Parsing of an example Socat time series data set and streaming to BinTable"){

		val g = rowsSource
			.alsoToMat(Sink.head[SocatTsvRow])(_ zip _)
			.via(socatTsvToBinTableConverter(nRows, formats))
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 1.second)

		assert(readResult.count === 72067)
		assert(nRowsWritten === nRows)
		assert(formats.valueFormats.keySet.diff(firstRow.header.columnNames.toSet) === Set("TIMESTAMP"))

	}

}
