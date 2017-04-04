package se.lu.nateko.cp.data.formats

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

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
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.meta.core.data.TimeInterval
import se.lu.nateko.cp.meta.core.data.TimeSeriesUploadCompletion

object TimeSeriesStreams {

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 8192, allowTruncation = true)
		.map(_.utf8String.trim)

	def errorCapturingParser[A <: ParsingAccumulator](parser: Flow[String, A, NotUsed])(implicit ctxt: ExecutionContext): Flow[String, A, Future[Done]] = {

		val errorExtractor: Sink[A, Future[Done]] = Flow[A]
			.filter(_.error.isDefined)
			.mapConcat[Throwable](_.error.toList)
			.toMat(Sink.headOption){(_, errOptFut) =>
				errOptFut.flatMap{
					case Some(err) => Future.failed(err)
					case _ => Future.successful(Done)
				}
			}

		val graph = GraphDSL.create(errorExtractor){implicit b => errorSink =>
			import GraphDSL.Implicits._
			val stringToAcc = b.add(parser)
			val accCloner = b.add(Broadcast[A](2))
			stringToAcc.out ~> accCloner.in

			val accFilter = b.add(Flow[A].filter(acc => acc.isOnData && acc.error.isEmpty))
			accCloner.out(0) ~> accFilter.in
			accCloner.out(1) ~> errorSink.in
			FlowShape(stringToAcc.in, accFilter.out)
		}

		Flow.fromGraph(graph)
	}

	def timeSeriesToBinTableConverter[H <: TableRowHeader](
		formatsFut: Future[ColumnFormats],
		factory: (H, ColumnFormats) => TimeSeriesToBinTableConverter
	)(implicit ctxt: ExecutionContext): Flow[TableRow[H], BinTableRow, Future[TimeSeriesUploadCompletion]] = {

		val graph = GraphDSL.create(Sink.head[ColumnFormats], Sink.head[BinTableRow], Sink.last[BinTableRow])(getCompletionInfo){ implicit b =>
			(formatsSink, firstRowSink, lastRowSink) =>

			import GraphDSL.Implicits._

			val formats = b.add(Broadcast[ColumnFormats](2))
			formats.out(0) ~> formatsSink.in
			b.add(Source.fromFuture(formatsFut)).out ~> formats.in

			val inputs = b.add(Broadcast[TableRow[H]](2))

			val zipToConverter = b.add(ZipWith[ColumnFormats, TableRow[H], TimeSeriesToBinTableConverter](
				(formats, row) => factory(row.header, formats)
			))

			formats.out(1) ~> zipToConverter.in0
			inputs.out(0) ~> zipToConverter.in1

			val converterRepeater = b.add(infiniteRepeater[TimeSeriesToBinTableConverter])
			zipToConverter.out ~> converterRepeater.in

			val zipToBinRow = b.add(ZipWith[TimeSeriesToBinTableConverter, TableRow[H], BinTableRow](
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
		)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for(
			formats <- formatsFut;
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield{
			val start = TimeSeriesToBinTableConverter.recoverTimeStamp(firstBin.cells, formats)
			val stop = TimeSeriesToBinTableConverter.recoverTimeStamp(lastBin.cells, formats)
			TimeSeriesUploadCompletion(TimeInterval(start, stop))
		}

}