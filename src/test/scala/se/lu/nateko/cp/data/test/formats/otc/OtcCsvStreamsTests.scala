package se.lu.nateko.cp.data.test.formats.otc

import java.io.File

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.stream.scaladsl.*
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.formats.*
import se.lu.nateko.cp.data.formats.ValueFormat.*
import se.lu.nateko.cp.data.formats.bintable.*
import se.lu.nateko.cp.data.formats.otc.OtcCsvStreams.*
import se.lu.nateko.cp.data.streams.KeepFuture

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class OtcCsvStreamsTests extends AnyFunSuite with BeforeAndAfterAll{

	private implicit val system: ActorSystem = ActorSystem("otccsvstreamstest")
	import system.dispatcher

	override def afterAll(): Unit = {
		Await.ready(system.terminate(), 3.seconds)
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)
	val nRows = 526
	val qualityFlagRows = 10

	val formats = ColumnsMetaWithTsCol(
		new ColumnsMeta(Seq(
			PlainColumn(Iso8601DateTime, "TIMESTAMP", isOptional = false),
			PlainColumn(DoubleValue, "Latitude", isOptional = false),
			PlainColumn(DoubleValue, "Longitude", isOptional = false),
			PlainColumn(FloatValue, "Depth water [m]", isOptional = false),
			PlainColumn(FloatValue, "Temp [°C]", isOptional = false),
			PlainColumn(FloatValue, "fCO2water_SST_wet [µatm] (Recomputed after SOCAT (Pfeil...)", isOptional = false),
		)),
		"TIMESTAMP"
	)

	private val rowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/26NA20050107_CO2_underway_SOCATv3.tab"))
		.via(TimeSeriesStreams.linesFromUtf8Binary)
		.viaMat(socatTsvParser(nRows, formats))(KeepFuture.left)

	private val qualityFlagRowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/otc_quality_flags.tab"))
		.via(TimeSeriesStreams.linesFromUtf8Binary)
		.viaMat(socatTsvParser(qualityFlagRows, formats))(KeepFuture.left)

	val binTableSink = BinTableSink(outFile("/socatTsvBinTest.cpb"), overwrite = true)

	test("Parsing of an example Socat time series data set"){

		val rowsFut = rowsSource.toMat(Sink.seq)(KeepFuture.right).run()
		val rows = Await.result(rowsFut, 3.second)

		assert(rows.size === nRows)
		assert(rows(2).cells(3) === "-42.94501") //stick-test
	}

	test("Parsing of an example time series data set with lat lon quality flag"){

		val rowsFut = qualityFlagRowsSource.toMat(Sink.seq)(KeepFuture.right).run()
		val rows = Await.result(rowsFut, 3.second)
		val rowsWithFlag = 3

		assert(rows.size === qualityFlagRows - rowsWithFlag)
	}

	test("Parsing of an example Socat time series data set and streaming to BinTable"){
		val converter = new TimeSeriesToBinTableConverter(formats.colsMeta)
		val g = rowsSource
			.wireTapMat(Sink.head[TableRow])(_ zip _)
			.map(converter.parseRow)
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 3.second)

		assert(readResult.count === 72067)
		assert(nRowsWritten === nRows)
		assert(formats.colsMeta.plainCols.keySet.diff(firstRow.header.columnNames.toSet) === Set())
	}

	test("Parser preserves the amount of rows"){
		val converter = new TimeSeriesToBinTableConverter(formats.colsMeta)
		val countFut = rowsSource
			.map(converter.parseRow)
			.toMat(Sink.fold(0)((count, _) => count + 1))(KeepFuture.right)
		val count = Await.result(countFut.run(), 3.second)
		assert(count === nRows)
	}

}
