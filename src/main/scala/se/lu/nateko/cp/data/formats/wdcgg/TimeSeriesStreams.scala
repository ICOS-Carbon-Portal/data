package se.lu.nateko.cp.data.formats.wdcgg

import akka.NotUsed
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Framing
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.formats.ValueFormat
import akka.stream.scaladsl.Keep
import scala.concurrent.Future
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.ZipWith
import akka.stream.FlowShape
import java.nio.charset.Charset

class WdcggRow(val columnNames: Array[String], val nRows: Int, val cells: Array[String])

object TimeSeriesStreams{

	type Formats = Map[String, ValueFormat]

	private val charSet = Charset.forName("Windows-1252").name()

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
		.map(_.decodeString(charSet).replace("\r", ""))

	def wdcggParser: Flow[String, WdcggRow, NotUsed] = Flow[String]
		.scan(TimeSeriesParser.seed)(TimeSeriesParser.parseLine)
		.dropWhile(acc => !acc.isOnData)
		.collect{
			case acc if (acc.cells.length == acc.header.columnNames.length) =>
				new WdcggRow(acc.header.columnNames, acc.header.totLength - acc.header.headerLength, acc.cells)
		}

	def wdcggToBinTableConverter(formatsFut: Future[Formats]): Flow[WdcggRow, BinTableRow, NotUsed] =
		Flow.fromGraph(GraphDSL.create(){ implicit b =>
			import GraphDSL.Implicits._

			val formats = b.add(Source.fromFuture(formatsFut))
			val inputs = b.add(Broadcast.apply[WdcggRow](2))

			val zipToConverter = b.add(ZipWith[Formats, WdcggRow, ToBinTableConverter](
				(formats, row) => new ToBinTableConverter(formats, row.columnNames, row.nRows)
			))

			formats.out ~> zipToConverter.in0
			inputs.out(0) ~> zipToConverter.in1

			val infRepeater = b.add(Flow.apply[ToBinTableConverter].mapConcat(Stream.continually(_)))
			val zipToResult = b.add(ZipWith[ToBinTableConverter, WdcggRow, BinTableRow](
				(conv, row) => new BinTableRow(conv.parseCells(row.cells), conv.schema)
			))

			zipToConverter.out ~> infRepeater.in
			infRepeater.out ~> zipToResult.in0
			inputs.out(1) ~> zipToResult.in1

			FlowShape(inputs.in, zipToResult.out)
		})

	def wdcggHeaderSink: Sink[String, Future[Map[String, String]]] = Flow[String]
		.scan(TimeSeriesParser.seed)(TimeSeriesParser.parseLine)
		.takeWhile(!_.isOnData)
		.map(_.header.kvPairs)
		.toMat(Sink.last)(Keep.right)
}
