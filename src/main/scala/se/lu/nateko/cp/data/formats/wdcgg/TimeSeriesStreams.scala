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
import se.lu.nateko.cp.data.formats.wdcgg.TimeSeriesParser.Header
import java.time.Instant
import se.lu.nateko.cp.meta.core.data.WdcggUploadCompletion
import scala.concurrent.ExecutionContext
import se.lu.nateko.cp.meta.core.data.TimeInterval

class WdcggRow(val header: Header, val cells: Array[String])

object TimeSeriesStreams{
	import ToBinTableConverter._

	private val charSet = Charset.forName("Windows-1252").name()

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
		.map(_.decodeString(charSet).replace("\r", ""))

	def wdcggParser: Flow[String, WdcggRow, NotUsed] = Flow[String]
		.scan(TimeSeriesParser.seed)(TimeSeriesParser.parseLine)
		.dropWhile(acc => !acc.isOnData)
		.collect{
			//TODO Check if the following is needed
			case acc if (acc.cells.length == acc.header.columnNames.length) =>
				new WdcggRow(acc.header, acc.cells)
		}

	def wdcggToBinTableConverter(formatsFut: Future[Formats])(implicit ctxt: ExecutionContext): Flow[WdcggRow, BinTableRow, Future[WdcggUploadCompletion]] = {
		val graph = GraphDSL.create(Sink.head[Formats], Sink.head[WdcggRow], Sink.head[BinTableRow], Sink.last[BinTableRow])(getCompletionInfo){ implicit b =>
			(formatsSink, firstWdcggSink, firstRowSink, lastRowSink) =>

			import GraphDSL.Implicits._

			val formats = b.add(Broadcast[Formats](2))
			formats.out(0) ~> formatsSink.in
			b.add(Source.fromFuture(formatsFut)).out ~> formats.in

			val inputs = b.add(Broadcast[WdcggRow](3))
			inputs.out(0) ~> firstWdcggSink.in

			val zipToConverter = b.add(ZipWith[Formats, WdcggRow, ToBinTableConverter](
				(formats, row) => new ToBinTableConverter(formats, row.header)
			))

			formats.out(1) ~> zipToConverter.in0
			inputs.out(1) ~> zipToConverter.in1

			val converterRepeater = b.add(infiniteRepeater[ToBinTableConverter])
			zipToConverter.out ~> converterRepeater.in

			val zipToBinRow = b.add(ZipWith[ToBinTableConverter, WdcggRow, BinTableRow](
				(conv, row) => new BinTableRow(conv.parseCells(row.cells), conv.schema)
			))

			converterRepeater.out ~> zipToBinRow.in0
			inputs.out(2) ~> zipToBinRow.in1

			val outputs = b.add(Broadcast[BinTableRow](3))
			outputs.out(0) ~> firstRowSink.in
			outputs.out(1) ~> lastRowSink.in
			zipToBinRow.out ~> outputs.in

			FlowShape(inputs.in, outputs.out(2))
		}
		Flow.fromGraph(graph)
	}

	def wdcggHeaderSink: Sink[String, Future[Map[String, String]]] = Flow[String]
		.scan(TimeSeriesParser.seed)(TimeSeriesParser.parseLine)
		.takeWhile(!_.isOnData)
		.map(_.header.kvPairs)
		.toMat(Sink.last)(Keep.right)

	private def infiniteRepeater[T]: Flow[T, T, NotUsed] = Flow.apply[T].mapConcat(Stream.continually(_))

	private def getCompletionInfo(
			formatsFut: Future[Formats],
			firstWdcggFut: Future[WdcggRow],
			firstBinFut: Future[BinTableRow],
			lastBinFut: Future[BinTableRow]
		)(implicit ctxt: ExecutionContext): Future[WdcggUploadCompletion] =
		for(
			formats <- formatsFut;
			firstWdcgg <- firstWdcggFut;
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield{
			val start = recoverTimeStamp(firstBin.cells, formats)
			val stop = recoverTimeStamp(lastBin.cells, formats)
			val header = firstWdcgg.header
			WdcggUploadCompletion(header.nRows, TimeInterval(start, stop), header.kvPairs)
		}
}
