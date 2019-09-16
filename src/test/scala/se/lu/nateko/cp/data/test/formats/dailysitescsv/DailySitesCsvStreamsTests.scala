package se.lu.nateko.cp.data.test.formats.dailysitescsv

import java.io.File

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.{Sink, StreamConverters}
import org.scalatest.{BeforeAndAfterAll, FunSuite}
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.BinTableSink
import se.lu.nateko.cp.data.formats.dailysitescsv.DailySitesCsvStreams

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class DailySitesCsvStreamsTests extends FunSuite with BeforeAndAfterAll {

	private implicit val system: ActorSystem = ActorSystem("dailysitescsvstreamstest")
	private implicit val materializer: ActorMaterializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		Await.ready(system.terminate(), 3.seconds)
	}

	private val nRows = 29
	private val binTableSink = BinTableSink(
		new File(getClass.getResource("/").getFile + "/atcCsvBinTest.cpb"),
		overwrite = true
	)

	private val formats = ColumnsMetaWithTsCol(
		new ColumnsMeta(Seq(
			PlainColumn(Iso8601DateTime, "TIMESTAMP", isOptional = false),
			PlainColumn(FloatValue, "pH", isOptional = false),
			PlainColumn(FloatValue, "Al (µg/l)", isOptional = false),
			PlainColumn(FloatValue, "Optional column", isOptional = true)
		)),
		"TIMESTAMP"
	)

	private val rowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/sdp_c5chem_2004.csv"))
		.via(TimeSeriesStreams.linesFromUtf8Binary)
		.via(DailySitesCsvStreams.standardCsvParser(nRows, formats))

	test("Parsing a daily SITES time series example") {
		val rowsFut = rowsSource.runWith(Sink.seq)
		val rows = Await.result(rowsFut, 1.second)

		assert(rows.size === nRows)
	}

	test("Timestamp column is injected into the table") {
		val rowFut = rowsSource
  		.runWith(Sink.head[TableRow])
		val row = Await.result(rowFut, 1.second)

		assert(row.header.columnNames.contains(formats.timeStampColumn))
		assert(row.cells.contains("2004-01-13T23:00:00Z"))
	}

	test("Parsing a daily SITES time series example and streaming to bintable") {
		val converter = new TimeSeriesToBinTableConverter(formats.colsMeta)
		val graph = rowsSource
			.wireTapMat(Sink.head[TableRow])(_ zip _)
  		.map(converter.parseRow)
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(graph.run(), 1.second)

		assert(readResult.count === 2873)
		assert(firstRow.header.nRows === nRows)
		assert(nRowsWritten === nRows)
		assert(formats.colsMeta.plainCols.keySet.diff(firstRow.header.columnNames.toSet) ===
			Set("Optional column"))
		assert(formats.colsMeta.findMissingColumns(firstRow.header.columnNames.toSeq).toSet === Set())
	}

}
