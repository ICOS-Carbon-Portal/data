package se.lu.nateko.cp.data.test.formats.dailysitescsv

import java.io.File

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.{Sink, StreamConverters}
import org.scalatest.{BeforeAndAfterAll, FunSuite}
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.BinTableSink
import se.lu.nateko.cp.data.formats.dailysitescsv.DailySitesCsvStreams._

import scala.concurrent.duration.DurationInt
import scala.concurrent.Await

class DailySitesCsvStreamsTests extends FunSuite with BeforeAndAfterAll {

	private implicit val system: ActorSystem = ActorSystem("dailysitescsvstreamstest")
	private implicit val materializer: ActorMaterializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		system.terminate()
	}

	private val nRows = 157
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
		.fromInputStream(() => getClass.getResourceAsStream("/sdp_c5chem_2004_2009.csv"))
		.via(linesFromBinary)
		.via(dailySitesCsvParser(nRows))

	test("Parsing a daily SITES time series example") {
		val rowsFut = rowsSource.runWith(Sink.seq)
		val rows = Await.result(rowsFut, 1.second)

		assert(rows.size === nRows)
	}

	test("Parsing a daily SITES time series example and streaming to bintable") {
		val graph = rowsSource.wireTapMat(Sink.head[ProperTableRow])(_ zip _)
			.via(dailySitesCsvToBinTableConverter(formats.colsMeta))
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(graph.run(), 1.second)

		assert(readResult.count === 12386)
		assert(firstRow.header.nRows === nRows)
		assert(nRowsWritten === nRows)
		assert(formats.colsMeta.plainCols.keySet.diff(firstRow.header.columnNames.toSet) ===
			Set("TIMESTAMP", "Optional column"))
		assert(formats.colsMeta.findMissingColumns(firstRow.header.columnNames.toSeq).toSet ===
			Set(PlainColumn(Iso8601DateTime, "TIMESTAMP", isOptional = false)))
	}

}
