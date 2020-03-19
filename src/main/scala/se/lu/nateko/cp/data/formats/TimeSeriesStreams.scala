package se.lu.nateko.cp.data.formats

import java.time.Instant

import akka.{Done, NotUsed}
import akka.stream.scaladsl.{Flow, Framing, Keep, Sink}
import akka.util.ByteString
import se.lu.nateko.cp.meta.core.data.{TabularIngestionExtract, TimeInterval, TimeSeriesUploadCompletion}
import se.lu.nateko.cp.data.utils.Akka.done

import scala.concurrent.{ExecutionContext, Future}
import java.time.temporal.TemporalUnit

object TimeSeriesStreams {

	implicit class TimeSeriesParserEnhancer[A <: ParsingAccumulator, M](val parser: Flow[String, A, M]) extends AnyVal {

		def exposeParsingError(implicit ctxt: ExecutionContext): Flow[String, A, Future[Done]] = {

			val errorSink: Sink[A, Future[Done]] = Flow.apply[A]
				.filter(_.error.isDefined)
				.toMat(Sink.headOption){(_, err) =>
					err.flatMap{
						_.flatMap(_.error).fold(done)(Future.failed)
					}
				}
			parser.alsoToMat(errorSink)(Keep.right)
		}

		def keepGoodRows: Flow[String, A, M] = parser.filter(acc => acc.isOnData && acc.error.isEmpty)
	}

	def linesFromUtf8Binary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 8192, allowTruncation = true)
		.map(_.utf8String.trim)
		.filter(_.nonEmpty)

	def getCompletionInfo(
		columnsMeta: ColumnsMeta,
		provideNRows: Boolean = false,
		timeStep: Option[(Long, TemporalUnit)] = None
	)(firstLast: FirstLastRows)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstRow <- firstLast.first;
			lastRow <- firstLast.last
		) yield {

			val defaultStart = Instant.parse(firstRow.cells(0))
			val start = timeStep.collect{
				case (step, unit) if step < 0 => defaultStart.plus(step, unit)
			}.getOrElse(defaultStart)

			val defaultStop = Instant.parse(lastRow.cells(0))
			val stop = timeStep.collect{
				case (step, unit) if step > 0 => defaultStop.plus(step, unit)
			}.getOrElse(defaultStop)

			val columnNames =
				if (columnsMeta.hasAnyRegexCols || columnsMeta.hasOptionalColumns)
					Some(columnsMeta.actualColumnNames(firstRow.header.columnNames.toIndexedSeq))
				else
					None

			val ingestionExtract = TabularIngestionExtract(columnNames, TimeInterval(start, stop))
			val nRowsInfo = if(provideNRows) Some(firstRow.header.nRows) else None

			TimeSeriesUploadCompletion(ingestionExtract, nRowsInfo)
		}

	def digestSink[R](extractor: FirstLastRows => R): Sink[TableRow, R] = Flow
		.apply[TableRow]
		.wireTapMat(Sink.head)(Keep.right)
		.toMat(Sink.last)((f, l) => extractor(new FirstLastRows(f, l)))

	class FirstLastRows(val first: Future[TableRow], val last: Future[TableRow])
}
