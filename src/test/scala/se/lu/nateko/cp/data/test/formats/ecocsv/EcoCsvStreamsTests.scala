package se.lu.nateko.cp.data.test.formats.ecocsv

import java.io.File

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.stream.scaladsl._
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.ecocsv.EcoCsvStreams._

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class EcoCsvStreamsTests extends AnyFunSuite with BeforeAndAfterAll{

	private implicit val system: ActorSystem = ActorSystem("ecocsvstreamstest")

	import system.dispatcher

	override def afterAll(): Unit = {
		Await.ready(system.terminate(), 3.seconds)
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)
	val nRows = 48

	val formats = ColumnsMetaWithTsCol(
		new ColumnsMeta(Seq(
			PlainColumn(EtcDate, "date", isOptional = false),
			PlainColumn(Iso8601DateTime, "TIMESTAMP", isOptional = false),
			PlainColumn(Iso8601TimeOfDay, "time", isOptional = false),
			PlainColumn(FloatValue, "H_1_1_1", isOptional = false),
			PlainColumn(FloatValue, "H_f_1_1_1", isOptional = false),
			PlainColumn(FloatValue, "Fc_1_1_1", isOptional = false),
			PlainColumn(FloatValue, "LE_1_1_1", isOptional = false),
			PlainColumn(FloatValue, "NEE_1_1_1", isOptional = false),
			PlainColumn(FloatValue, "Ustar_1_1_1", isOptional = false),
		)),
	"TIMESTAMP"
	)

	private val rowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/SE-Htm_fluxes_2015-01-01_CP_flag.txt"))
		.via(TimeSeriesStreams.linesFromUtf8Binary)
		.via(ecoCsvParser(nRows, formats))

	val binTableSink = BinTableSink(outFile("/ecoCsvBinTest.cpb"), overwrite = true)
	val rows: Seq[TableRow] = Await.result(rowsSource.runWith(Sink.seq), 1.second)

	test("Parsing of an example Eco time series data set"){
		assert(rows.size === nRows)
		assert(rows(25).cells(3) === "3.0267") //stick-test
	}

	test("Insert a timestamp column") {
		assert(rows(10).cells(0) === "2015-01-01T04:30:00Z")
	}

	test("Replace null values with an empty string") {
		assert(rows(1).cells(3) === "")
	}

	test("Parsing of an example Eco time series data set and streaming to BinTable"){
		val converter = new TimeSeriesToBinTableConverter(formats.colsMeta)
		val g = rowsSource
			.wireTapMat(Sink.head[TableRow])(_ zip _)
			.map(converter.parseRow)
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 1.second)

		assert(readResult.count === 4206)
		assert(nRowsWritten === nRows)
		assert(formats.colsMeta.plainCols.keySet.diff(firstRow.header.columnNames.toSet) === Set())
	}

}
