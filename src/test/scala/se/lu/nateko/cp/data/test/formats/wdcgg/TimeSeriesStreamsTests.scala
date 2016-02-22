package se.lu.nateko.cp.data.test.formats.wdcgg

import java.io.File
import org.scalatest.FunSuite
import akka.stream.scaladsl._
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.wdcgg.TimeSeriesStreams._
import akka.actor.ActorSystem
import akka.stream.{ClosedShape, ActorMaterializer}
import akka.stream.scaladsl.Broadcast
import org.scalatest.BeforeAndAfterAll
import se.lu.nateko.cp.data.formats.wdcgg.WdcggRow
import scala.concurrent.{Future, Await}
import scala.concurrent.duration.DurationInt

class TimeSeriesStreamsTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system = ActorSystem("bintabletest")
	private implicit val materializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll() {
		system.shutdown()
	}

	def outFile(fileName: String) = new File(getClass.getResource("/").getFile + fileName)
	def wdcggStream = getClass.getResourceAsStream("/ams137s00.lsce.as.cn.co2.nl.mo.dat")
	val expectedNRows = 360

	val formats = Map(
		"DATE" -> Iso8601DateValue,
		"TIME" -> Iso8601TimeOfDayValue,
		"CO2" -> FloatValue,
		"ND" -> IntValue,
		"SD" -> FloatValue
	)

	val rowsSource = StreamConverters
			.fromInputStream(() => wdcggStream)
			.via(linesFromBinary)
			.via(wdcggParser)

	val binTableSink = BinTableSink(outFile("/wdcggBinTest.cpb"), true)


	test("Parsing of an example WDCGG time series data set"){

		val rowsFut = StreamConverters
			.fromInputStream(() => wdcggStream)
			.via(linesFromBinary)
			.via(wdcggParser)
			.runWith(Sink.seq)

		val rows = Await.result(rowsFut, 3 seconds)

		assert(rows.size === rows.head.nRows)
		assert(rows.size === expectedNRows)
	}

	test("Parsing and writing of an example WDCGG time series data set"){

		val binTableExport: RunnableGraph[Future[(Long, Long)]] = rowsSource
			.via(wdcggToBinTableConverter(formats))
			.toMat(binTableSink)(Keep.both).mapMaterializedValue{
				case (fut1, fut2) => for(nBytes <- fut1; nRows <- fut2) yield (nBytes, nRows)
			}

		val rowCountsFut = rowsSource.runFold[(Int, Int)]((0, 0)){
			case ((0, _), firstRow) => (firstRow.nRows, 1)
			case ( (schemaNRows, count), _) => (schemaNRows, count + 1)
		}

		val (schemaNRows, nRowsInSource) = Await.result(rowCountsFut, 3 seconds)

		val (nBytesRead, nRowsWritten) = Await.result(binTableExport.run(), 3 seconds)

		assert(schemaNRows === nRowsInSource)
		assert(nRowsWritten === nRowsInSource)
		assert(nRowsWritten === expectedNRows)
		assert(nBytesRead === 29454)
	}

	test("Parsing (single pass) and writing using 'alsoToMat' of an example WDCGG time series data set"){

		val g = rowsSource
			.alsoToMat(Sink.head[WdcggRow])(_ zip _)
			.via(wdcggToBinTableConverter(formats))
			.toMat(binTableSink)(_ zip _)

		val ((bytesRead, firstRow), nRowsWritten) = Await.result(g.run(), 3 seconds)

		assert(bytesRead === 29454)
		assert(firstRow.nRows === expectedNRows)
		assert(nRowsWritten === expectedNRows)

	}

	test("Parsing (single pass) and writing using broadcast of an example WDCGG time series data set"){

		val g = RunnableGraph.fromGraph(GraphDSL.create(Sink.head[Int], binTableSink)(
			(schemaNRowsFut, nRowsWrittenFut) =>
				for(
					schemaNRows <- schemaNRowsFut;
					nRowsWritten <- nRowsWrittenFut
				) yield (schemaNRows, nRowsWritten)
		) { implicit builder =>
			(schemaNRowsSinkShape, binTableSinkShape) =>
				import GraphDSL.Implicits._

				val bCast = builder.add(Broadcast[WdcggRow](2))
				rowsSource ~> bCast

				bCast ~> Flow[WdcggRow].map(_.nRows) ~> schemaNRowsSinkShape.in
				bCast ~> wdcggToBinTableConverter(formats) ~> binTableSinkShape

				ClosedShape
		})

		val (schemaNRows, nRowsWritten) = Await.result(g.run(), 3 seconds)

		assert(schemaNRows === expectedNRows)
		assert(nRowsWritten === expectedNRows)
	}
}