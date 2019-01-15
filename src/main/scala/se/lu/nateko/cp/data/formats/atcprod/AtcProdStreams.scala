package se.lu.nateko.cp.data.formats.atcprod

import akka.Done
import akka.stream.FlowShape
import akka.stream.scaladsl.{Broadcast, Flow, GraphDSL, Sink, ZipWith}
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats.atcprod.AtcProdParser._
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.{ColumnsMetaWithTsCol, TimeSeriesToBinTableConverter}
import se.lu.nateko.cp.meta.core.data.{TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

class AtcProdRow(val header: Header, val cells: Array[String])

object AtcProdStreams{
	import TimeSeriesToBinTableConverter.recoverTimeStamp

	def atcProdParser(implicit ctxt: ExecutionContext): Flow[String, AtcProdRow, Future[Done]] = Flow[String]
		.scan(seed)(parseLine)
		.exposeParsingError
		.keepGoodRows
		.map(acc => new AtcProdRow(acc.header, acc.cells))


	def atcProdToBinTableConverter(formats: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext): Flow[AtcProdRow, BinTableRow, Future[TimeSeriesUploadCompletion]] = {
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

	private def getCompletionInfo(formats: ColumnsMetaWithTsCol)(
			firstAtcProdFut: Future[AtcProdRow],
			firstBinFut: Future[BinTableRow],
			lastBinFut: Future[BinTableRow]
		)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for(
			firstProd <- firstAtcProdFut;
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield{
			val sortedColumns = firstProd.header.columnNames
			val start = recoverTimeStamp(firstBin.cells, sortedColumns, formats.timeStampColumn)
			val stop = recoverTimeStamp(lastBin.cells, sortedColumns, formats.timeStampColumn)
			TimeSeriesUploadCompletion(TimeInterval(start, stop), Some(firstProd.header.nRows))
		}
}
