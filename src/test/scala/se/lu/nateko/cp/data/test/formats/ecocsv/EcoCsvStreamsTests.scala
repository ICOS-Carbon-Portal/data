package se.lu.nateko.cp.data.test.formats.ecocsv

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
import se.lu.nateko.cp.data.formats.ecocsv.EcoCsvRow
import se.lu.nateko.cp.data.formats.ecocsv.EcoCsvStreams._

class EcoCsvStreamsTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system = ActorSystem("ecocsvstreamstest")
	private implicit val materializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll(): Unit = {
		system.terminate()
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)
	val nRows = 48

	val formats = ColumnFormats(
		Map(
			"date" -> EtcDate,
			"TIMESTAMP" -> Iso8601DateTime,
			"time" -> Iso8601TimeOfDay,
			"H_1_1_1" -> FloatValue,
			"H_f_1_1_1" -> FloatValue,
			"Fc_1_1_1" -> FloatValue,
			"LE_1_1_1" -> FloatValue,
			"NEE_1_1_1" -> FloatValue,
			"Ustar_1_1_1" -> FloatValue
		),
	"TIMESTAMP"
	)

	val rowsSource = StreamConverters
		.fromInputStream(() => getClass.getResourceAsStream("/SE-Htm_fluxes_2015-01-01_CP_flag.txt"))
		.via(TimeSeriesStreams.linesFromBinary)
		.via(ecoCsvParser)

	val binTableSink = BinTableSink(outFile("/ecoCsvBinTest.cpb"), true)

	test("Parsing of an example Eco time series data set"){

		val rowsFut = rowsSource.runWith(Sink.seq)

		val rows = Await.result(rowsFut, 1.second)

		assert(rows.size === nRows)
		assert(rows(25).cells(2) === "3.0267") //stick-test
	}

	test("Parsing of an example Eco time series data set and streaming to BinTable"){

		val g = rowsSource
			.wireTapMat(Sink.head[EcoCsvRow])(_ zip _)
			.via(ecoCsvToBinTableConverter(nRows, formats))
			.toMat(binTableSink)(_ zip _)

		val ((readResult, firstRow), nRowsWritten) = Await.result(g.run(), 1.second)

		assert(readResult.count === 4206)
		assert(nRowsWritten === nRows)
		assert(formats.valueFormats.keySet.diff(firstRow.header.columnNames.toSet) === Set("TIMESTAMP"))

	}

}
