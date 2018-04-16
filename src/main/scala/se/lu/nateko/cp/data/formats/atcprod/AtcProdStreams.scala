package se.lu.nateko.cp.data.formats.atcprod

import java.nio.charset.Charset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import AtcProdParser._
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
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats.TimeSeriesToBinTableConverter
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.meta.core.data.TimeInterval
import se.lu.nateko.cp.meta.core.data.TimeSeriesUploadCompletion

class AtcProdRow(val header: Header, val cells: Array[String])

object AtcProdStreams{
	import TimeSeriesToBinTableConverter.recoverTimeStamp

	def atcProdParser(implicit ctxt: ExecutionContext): Flow[String, AtcProdRow, Future[Done]] = Flow[String]
		.scan(seed)(parseLine)
		.exposeParsingError
		.keepGoodRows
		.map(acc => new AtcProdRow(acc.header, acc.cells))


	def atcProdToBinTableConverter(formats: ColumnFormats)(implicit ctxt: ExecutionContext): Flow[AtcProdRow, BinTableRow, Future[TimeSeriesUploadCompletion]] = {
		val graph = GraphDSL.create(Sink.head[AtcProdRow], Sink.head[BinTableRow], Sink.last[BinTableRow])(getCompletionInfo(formats)){ implicit b =>
			(firstWdcggSink, firstRowSink, lastRowSink) =>

			import GraphDSL.Implicits._

			val inputs = b.add(Broadcast[AtcProdRow](3))
			inputs.out(0) ~> firstWdcggSink.in

			val rowConverterRepeated = b.add(
				Flow[AtcProdRow].take(1)
					.map(row => new AtcProdToBinTableConverter(formats, row.header))
					.mapConcat(Stream.continually(_)) //repeating the same instance indefinitely
			)

			inputs.out(1) ~> rowConverterRepeated.in

			val zipToBinRow = b.add(ZipWith[AtcProdToBinTableConverter, AtcProdRow, BinTableRow](
				(conv, row) => new BinTableRow(conv.parseCells(row.cells), conv.schema)
			))

			rowConverterRepeated.out ~> zipToBinRow.in0
			inputs.out(2) ~> zipToBinRow.in1

			val outputs = b.add(Broadcast[BinTableRow](3))
			outputs.out(0) ~> firstRowSink.in
			outputs.out(1) ~> lastRowSink.in
			zipToBinRow.out ~> outputs.in

			FlowShape(inputs.in, outputs.out(2))
		}
		Flow.fromGraph(graph)
	}

	private def getCompletionInfo(formats: ColumnFormats)(
			firstAtcProdFut: Future[AtcProdRow],
			firstBinFut: Future[BinTableRow],
			lastBinFut: Future[BinTableRow]
		)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for(
			firstProd <- firstAtcProdFut;
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield{
			val start = recoverTimeStamp(firstBin.cells, formats)
			val stop = recoverTimeStamp(lastBin.cells, formats)
			TimeSeriesUploadCompletion(TimeInterval(start, stop), Some(firstProd.header.nRows))
		}
}
