package se.lu.nateko.cp.data.test.formats

import java.io.{InputStream, File}
import java.util.Locale
import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.io.Framing
import akka.stream.scaladsl._
import akka.util.ByteString
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.{BinTableRow, BinTableSink, Schema}
import se.lu.nateko.cp.data.formats.wdcgg.{TimeSeriesFlows, TimeSeriesParser}

import scala.concurrent.duration.DurationInt
import scala.concurrent.{Await, Future}

class StreamTest() {
	implicit val system = ActorSystem("stream")
	implicit val materializer = ActorMaterializer()

	def runTest(inStream: InputStream, outFile: File) = {
		//runTest(getClass.getResourceAsStream("/ams137s00.lsce.as.cn.co2.nl.mo.dat"), new File("/home/roger/tmp/wdcggBinTest.cpb"))

		val linesStream: Source[String, Future[Long]] =
			StreamConverters.fromInputStream(() => inStream)
				.via(Framing.delimiter(
					ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
				)
				.map(_.utf8String)

		val parser = new TimeSeriesParser(Locale.UK,
			"DATE" -> Iso8601DateValue,
			"TIME" -> Iso8601TimeOfDayValue,
			"CO2" -> FloatValue,
			"ND" -> IntValue,
			"SD" -> FloatValue
		)

		val wdcggParsingFlow = new TimeSeriesFlows(parser).wdcggParsingFlow

//		val wdcggParsingFlow: Flow[String, Array[AnyRef], Unit] = Flow[String]
//				.scan(TimeSeriesParser.seed)(parser.parseLine)
//				.dropWhile(acc => !acc.isOnData || acc.cells.isEmpty)
//				.map(_.cells)

		val binTblSchema: Schema = new Schema(parser.schema.map(_._2).map(parser.valueFormatParser.getBinTableDataType).toArray, 360)

		val binSink = BinTableSink(outFile, overwrite = true)

		val debug1: Flow[String, String, Unit] = Flow[String].map(s => {println(s"Raw string: $s"); s})
		val debug2: Flow[Array[AnyRef], Array[AnyRef], Unit] = Flow[Array[AnyRef]].map(arr => {println("Parsed: " + arr.mkString(" :: ")); arr})

		val graph: RunnableGraph[Future[Long]] =
			linesStream
					.via(debug1)
					.via(wdcggParsingFlow)
					.via(debug2)
					.map(row => new BinTableRow(row, binTblSchema))
					.toMat(binSink)(Keep.right)

		val rows = Await.result(graph.run(), 3 seconds)

		assert(rows == 360)

		rows
	}
}

object StreamTest{

}
