package se.lu.nateko.cp.data.formats

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.NotUsed
import akka.stream.FlowShape
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Framing
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.ZipWith
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.meta.core.data.TimeInterval
import se.lu.nateko.cp.meta.core.data.TimeSeriesUploadCompletion

object TimeSeriesStreams {

	implicit class TimeSeriesParserEnhancer[A <: ParsingAccumulator, M](val parser: Flow[String, A, M]) extends AnyVal {

		def exposeParsingError(implicit ctxt: ExecutionContext): Flow[String, A, Future[Done]] = {

			val errorSink: Sink[A, Future[Done]] = Flow.apply[A]
				.filter(_.error.isDefined)
				.toMat(Sink.headOption){(_, err) =>
					err.flatMap{
						_.flatMap(_.error).fold(Future.successful(Done))(Future.failed)
					}
				}
			parser.alsoToMat(errorSink)(Keep.right)
		}

		def keepGoodRows: Flow[String, A, M] = parser.filter(acc => acc.isOnData && acc.error.isEmpty)
	}


	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 8192, allowTruncation = true)
		.map(_.utf8String.trim)
		.filter(_.size > 0)


	def timeSeriesToBinTableConverter[H <: TableRowHeader](
		formats: ColumnFormats,
		factory: H => TimeSeriesToBinTableConverter
	)(implicit ctxt: ExecutionContext): Flow[TableRow[H], BinTableRow, Future[TimeSeriesUploadCompletion]] = {

		val graph = GraphDSL.create(Sink.head[BinTableRow], Sink.last[BinTableRow])(getCompletionInfo(formats)){ implicit b =>
			(firstRowSink, lastRowSink) =>

			import GraphDSL.Implicits._

			val inputs = b.add(Broadcast[TableRow[H]](2))

			val rowConverterRepeated = b.add(
				Flow[TableRow[H]].take(1)
					.map(row => factory(row.header))
					.mapConcat(Stream.continually(_)) //repeating the same instance indefinitely
			)

			inputs.out(0) ~> rowConverterRepeated.in

			val zipToBinRow = b.add(ZipWith[TimeSeriesToBinTableConverter, TableRow[H], BinTableRow](
				(conv, row) => new BinTableRow(conv.parseCells(row.cells), conv.schema)
			))

			rowConverterRepeated.out ~> zipToBinRow.in0
			inputs.out(1) ~> zipToBinRow.in1

			val outputs = b.add(Broadcast[BinTableRow](3))
			outputs.out(0) ~> firstRowSink.in
			outputs.out(1) ~> lastRowSink.in
			zipToBinRow.out ~> outputs.in

			FlowShape(inputs.in, outputs.out(2))
		}
		Flow.fromGraph(graph)
	}

	private def getCompletionInfo(formats: ColumnFormats)(
			firstBinFut: Future[BinTableRow],
			lastBinFut: Future[BinTableRow]
		)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for(
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield{
			val start = TimeSeriesToBinTableConverter.recoverTimeStamp(firstBin.cells, formats)
			val stop = TimeSeriesToBinTableConverter.recoverTimeStamp(lastBin.cells, formats)
			TimeSeriesUploadCompletion(TimeInterval(start, stop), None)
		}

}