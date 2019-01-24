package se.lu.nateko.cp.data.formats.dailysitescsv

import java.time.temporal.ChronoUnit
import java.time.{Instant, LocalDate, LocalTime, ZoneOffset}

import akka.stream.scaladsl.{Flow, Keep, Sink}
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.meta.core.data.{IngestionMetadataExtract, TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

object DailySitesCsvStreams {
	import se.lu.nateko.cp.data.formats.TimeSeriesStreams.TimeSeriesParserEnhancer

	def dailySitesCsvParser(nRows: Int, timeStampColumn: String)(implicit ctxt: ExecutionContext)
	: Flow[String, ProperTableRow, Future[IngestionMetadataExtract]] = {
		val parser = new DailySitesCsvParser(nRows)

		Flow.apply[String]
			.scan(parser.seed)(parser.parseLine)
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				ProperTableRow(
					acc.header.copy(columnNames = timeStampColumn +: acc.header.columnNames),
					makeTimeStamp(acc.cells(0)).toString +: acc.cells
				)
			)
			.alsoToMat(dailySitesCsvUploadCompletetionSink)(Keep.right)
	}

	def dailySitesCsvUploadCompletetionSink(implicit ctxt: ExecutionContext)
	: Sink[ProperTableRow, Future[TimeSeriesUploadCompletion]] = {
		Flow.apply[ProperTableRow]
			.wireTapMat(Sink.head)(Keep.right)
			.toMat(Sink.last)(getCompletionInfo())
	}

	private def getCompletionInfo()(
		firstRowFut: Future[ProperTableRow],
		lastRowFut: Future[ProperTableRow]
	)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstRow <- firstRowFut;
			lastRow <- lastRowFut
		) yield {
			val start = Instant.parse(firstRow.cells(0))
			val stop = Instant.parse(lastRow.cells(0)).plus(1, ChronoUnit.DAYS)
			TimeSeriesUploadCompletion(TimeInterval(start, stop), None)
		}

	private def makeTimeStamp(localDate: String): Instant = {
		val parsedTime = LocalDate.parse(localDate).atTime(LocalTime.MIN)
		parsedTime.toInstant(ZoneOffset.ofHours(1))
	}

}
