package se.lu.nateko.cp.data.test.formats.etcprod

import java.io.File

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.{Sink, StreamConverters}
import org.scalatest.{BeforeAndAfterAll, FunSuite}
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.BinTableSink
import se.lu.nateko.cp.data.formats.etcprod.EtcHalfHourlyProductStreams

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class EtcHalfHourlyProductStreamsTests extends FunSuite with BeforeAndAfterAll {

	private implicit val system: ActorSystem = ActorSystem("etchalfhourlyproductstreamstest")
	private implicit val materializer: ActorMaterializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		system.terminate()
	}

	private val nRows = 29
	private val binTableSink = BinTableSink(
		new File(getClass.getResource("/").getFile + "/etcProductCsvBinTest.cpb"),
		overwrite = true
	)

	private val formats = ColumnsMetaWithTsCol(
		new ColumnsMeta(Seq(
			PlainColumn(Iso8601DateTime, "TIMESTAMP", isOptional = false),
			PlainColumn(FloatValue, "TA_ERA", isOptional = false),
			PlainColumn(FloatValue, "TA_F", isOptional = false)
		)),
		"TIMESTAMP"
	)

	private val rowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/fluxnet_hh.csv"))
		.via(TimeSeriesStreams.linesFromUtf8Binary)
		.via(new EtcHalfHourlyProductStreams(2).simpleCsvParser(nRows, formats))

	test("Parsing a daily ETC fluxnet product time series example") {
		val rowsFut = rowsSource.runWith(Sink.seq)
		val rows = Await.result(rowsFut, 1.second)

		assert(rows.size === nRows)
	}

	test("Timestamp column is injected into the table") {
		val rowFut = rowsSource.runWith(Sink.head[TableRow])
		val row = Await.result(rowFut, 1.second)

		assert(row.header.columnNames.contains(formats.timeStampColumn))
		assert(row.cells(0) === "2017-12-31T22:30:00Z")
	}

	test("Parsing a half-hourly ETC product example and streaming to bintable") {
		val converter = new TimeSeriesToBinTableConverter(formats.colsMeta)
		val graph = rowsSource
			.wireTapMat(Sink.head[TableRow])(_ zip _)
			.map(converter.parseRow)
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(graph.run(), 1.second)

		assert(readResult.count === 33297)
		assert(firstRow.header.nRows === nRows)
		assert(nRowsWritten === nRows)
		assert(formats.colsMeta.findMissingColumns(firstRow.header.columnNames.toSeq).toSet === Set())
	}

}
