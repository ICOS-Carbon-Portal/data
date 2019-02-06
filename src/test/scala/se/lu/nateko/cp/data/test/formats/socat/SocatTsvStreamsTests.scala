package se.lu.nateko.cp.data.test.formats.socat

import java.io.File

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl._
import org.scalatest.{BeforeAndAfterAll, FunSuite}
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.socat.SocatTsvStreams._
import se.lu.nateko.cp.data.streams.KeepFuture

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class SocatTsvStreamsTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system: ActorSystem = ActorSystem("socattsvstreamstest")
	private implicit val materializer: ActorMaterializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		system.terminate()
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)
	val nRows = 526

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
		.via(TimeSeriesStreams.linesFromBinary)
		.viaMat(socatTsvParser(nRows, formats))(KeepFuture.left)

	val binTableSink = BinTableSink(outFile("/socatTsvBinTest.cpb"), overwrite = true)

	test("Parsing of an example Socat time series data set"){

		val rowsFut = rowsSource.toMat(Sink.seq)(KeepFuture.right).run()
		val rows = Await.result(rowsFut, 3.second)

		assert(rows.size === nRows)
		assert(rows(2).cells(3) === "-42.94501") //stick-test
	}

	test("Parsing of an example Socat time series data set and streaming to BinTable"){
		val converter = new ProperTimeSeriesToBinTableConverter(formats.colsMeta)
		val g = rowsSource
			.wireTapMat(Sink.head[ProperTableRow])(_ zip _)
			.map(converter.parseRow)
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 3.second)

		assert(readResult.count === 72067)
		assert(nRowsWritten === nRows)
		assert(formats.colsMeta.plainCols.keySet.diff(firstRow.header.columnNames.toSet) === Set())
	}

	test("Parser preserves the amount of rows"){
		val converter = new ProperTimeSeriesToBinTableConverter(formats.colsMeta)
		val countFut = rowsSource
  		.map(converter.parseRow)
			.toMat(Sink.fold(0)((count, _) => count + 1))(KeepFuture.right)
		val count = Await.result(countFut.run(), 3.second)
		assert(count === nRows)
	}

}
