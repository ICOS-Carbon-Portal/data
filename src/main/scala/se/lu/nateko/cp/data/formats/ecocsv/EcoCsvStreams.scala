package se.lu.nateko.cp.data.formats.ecocsv

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import EcoCsvParser._
import akka.Done

import akka.NotUsed
import akka.stream.FlowShape
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Framing
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.ZipWith
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.ColumnFormats
import se.lu.nateko.cp.data.formats.TimeSeriesStreams
import se.lu.nateko.cp.data.formats.TimeSeriesToBinTableConverter._
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.meta.core.data.EcoCsvUploadCompletion
import se.lu.nateko.cp.meta.core.data.TimeInterval

class EcoCsvRow(val header: Header, val cells: Array[String])

object EcoCsvStreams{

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
		.map(_.utf8String.trim)

	def ecoCsvParser(implicit ctxt: ExecutionContext): Flow[String, EcoCsvRow, Future[Done]] =
		TimeSeriesStreams.errorCapturingParser(Flow[String].scan(seed)(parseLine))
			.map(acc => new EcoCsvRow(acc.header, acc.cells))


	def ecoCsvToBinTableConverter(nRows: Int, formatsFut: Future[ColumnFormats])(implicit ctxt: ExecutionContext): Flow[EcoCsvRow, BinTableRow, Future[EcoCsvUploadCompletion]] = {
		val graph = GraphDSL.create(Sink.head[ColumnFormats], Sink.head[BinTableRow], Sink.last[BinTableRow])(getCompletionInfo){ implicit b =>
			(formatsSink, firstRowSink, lastRowSink) =>

			import GraphDSL.Implicits._

			val formats = b.add(Broadcast[ColumnFormats](2))
			formats.out(0) ~> formatsSink.in
			b.add(Source.fromFuture(formatsFut)).out ~> formats.in

			val inputs = b.add(Broadcast[EcoCsvRow](2))

			val zipToConverter = b.add(ZipWith[ColumnFormats, EcoCsvRow, EcoCsvToBinTableConverter](
				(formats, row) => new EcoCsvToBinTableConverter(formats, row.header, nRows)
			))

			formats.out(1) ~> zipToConverter.in0
			inputs.out(0) ~> zipToConverter.in1

			val converterRepeater = b.add(infiniteRepeater[EcoCsvToBinTableConverter])
			zipToConverter.out ~> converterRepeater.in

			val zipToBinRow = b.add(ZipWith[EcoCsvToBinTableConverter, EcoCsvRow, BinTableRow](
				(conv, row) => new BinTableRow(conv.parseCells(row.cells), conv.schema)
			))

			converterRepeater.out ~> zipToBinRow.in0
			inputs.out(1) ~> zipToBinRow.in1

			val outputs = b.add(Broadcast[BinTableRow](3))
			outputs.out(0) ~> firstRowSink.in
			outputs.out(1) ~> lastRowSink.in
			zipToBinRow.out ~> outputs.in

			FlowShape(inputs.in, outputs.out(2))
		}
		Flow.fromGraph(graph)
	}

	private def infiniteRepeater[T]: Flow[T, T, NotUsed] = Flow.apply[T].mapConcat(Stream.continually(_))

	private def getCompletionInfo(
			formatsFut: Future[ColumnFormats],
			firstBinFut: Future[BinTableRow],
			lastBinFut: Future[BinTableRow]
		)(implicit ctxt: ExecutionContext): Future[EcoCsvUploadCompletion] =
		for(
			formats <- formatsFut;
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield{
			val start = recoverTimeStamp(firstBin.cells, formats)
			val stop = recoverTimeStamp(lastBin.cells, formats)
			EcoCsvUploadCompletion(TimeInterval(start, stop))
		}
}
