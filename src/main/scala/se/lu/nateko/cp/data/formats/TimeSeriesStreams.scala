package se.lu.nateko.cp.data.formats

import java.time.Instant

import akka.{Done, NotUsed}
import akka.stream.scaladsl.{Flow, Framing, Keep, Sink}
import akka.util.ByteString
import se.lu.nateko.cp.meta.core.data.{TabularIngestionExtract, TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

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
		.filter(_.nonEmpty)

	def getCompletionInfo(columnsMeta: ColumnsMeta)(
		firstRowFut: Future[TableRow],
		lastRowFut: Future[TableRow]
	)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstRow <- firstRowFut;
			lastRow <- lastRowFut
		) yield {
			val start = Instant.parse(firstRow.cells(0))
			val stop = Instant.parse(lastRow.cells(0))
			val columnNames = if (columnsMeta.hasAnyRegexCols || columnsMeta.hasOptionalColumns) Some(columnsMeta.actualColumnNames(firstRow.header.columnNames)) else None
			val ingestionExtract = TabularIngestionExtract(columnNames, TimeInterval(start, stop))
			TimeSeriesUploadCompletion(ingestionExtract, None)
		}

}