package se.lu.nateko.cp.data.formats.wdcgg

import java.nio.charset.Charset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import WdcggParser._
import akka.Done

import akka.NotUsed
import akka.stream.FlowShape
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Framing
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.ZipWith
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.ColumnFormats
import se.lu.nateko.cp.data.formats.TimeSeriesStreams
import se.lu.nateko.cp.data.formats.TimeSeriesToBinTableConverter
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.meta.core.data.TimeInterval
import se.lu.nateko.cp.meta.core.data.WdcggUploadCompletion

class WdcggRow(val header: Header, val cells: Array[String])

object WdcggStreams{
	import TimeSeriesToBinTableConverter.recoverTimeStamp

	private val charSet = Charset.forName("Windows-1252").name()

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
		.map(_.decodeString(charSet).replace("\r", ""))


	def wdcggParser(implicit ctxt: ExecutionContext): Flow[String, WdcggRow, Future[Done]] =
		TimeSeriesStreams.errorCapturingParser(Flow[String].scan(seed)(parseLine))
			.map(acc => new WdcggRow(acc.header, acc.cells))


	def wdcggToBinTableConverter(formatsFut: Future[ColumnFormats])(implicit ctxt: ExecutionContext): Flow[WdcggRow, BinTableRow, Future[WdcggUploadCompletion]] = {
		val graph = GraphDSL.create(Sink.head[ColumnFormats], Sink.head[WdcggRow], Sink.head[BinTableRow], Sink.last[BinTableRow])(getCompletionInfo){ implicit b =>
			(formatsSink, firstWdcggSink, firstRowSink, lastRowSink) =>

			import GraphDSL.Implicits._

			val formats = b.add(Broadcast[ColumnFormats](2))
			formats.out(0) ~> formatsSink.in
			b.add(Source.fromFuture(formatsFut)).out ~> formats.in

			val inputs = b.add(Broadcast[WdcggRow](3))
			inputs.out(0) ~> firstWdcggSink.in

			val zipToConverter = b.add(ZipWith[ColumnFormats, WdcggRow, WdcggToBinTableConverter](
				(formats, row) => new WdcggToBinTableConverter(formats, row.header)
			))

			formats.out(1) ~> zipToConverter.in0
			inputs.out(1) ~> zipToConverter.in1

			val converterRepeater = b.add(infiniteRepeater[WdcggToBinTableConverter])
			zipToConverter.out ~> converterRepeater.in

			val zipToBinRow = b.add(ZipWith[WdcggToBinTableConverter, WdcggRow, BinTableRow](
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
		.scan(seed)(parseLine)
		.takeWhile(!_.isOnData)
		.map(_.header.kvPairs)
		.toMat(Sink.last)(Keep.right)

	private def infiniteRepeater[T]: Flow[T, T, NotUsed] = Flow.apply[T].mapConcat(Stream.continually(_))

	private val headerKeys = Set(
		"STATION NAME", "OBSERVATION CATEGORY", CountryKey, "CONTRIBUTOR",
		"LATITUDE", "LONGITUDE", "CONTACT POINT", ParamKey, "TIME INTERVAL",
		MeasUnitKey, "MEASUREMENT METHOD", SamplingTypeKey, "MEASUREMENT SCALE"
	)

	private def getCompletionInfo(
			formatsFut: Future[ColumnFormats],
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
			val keyValues = header.kvPairs.filterKeys(headerKeys.contains)
			WdcggUploadCompletion(header.nRows, TimeInterval(start, stop), keyValues)
		}
}
