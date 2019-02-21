package se.lu.nateko.cp.data.formats.dailysitescsv

import java.time.temporal.ChronoUnit
import java.time.{Instant, LocalDate, LocalTime, ZoneOffset}

import akka.stream.scaladsl.{Flow, Keep, Sink}
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.meta.core.data.{IngestionMetadataExtract, TabularIngestionExtract, TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

object DailySitesCsvStreams {
	import se.lu.nateko.cp.data.formats.TimeSeriesStreams.TimeSeriesParserEnhancer

	def dailySitesCsvParser(nRows: Int, format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext)
	: Flow[String, TableRow, Future[IngestionMetadataExtract]] = {
		val parser = new DailySitesCsvParser(nRows)

		Flow.apply[String]
			.scan(parser.seed)(parser.parseLine)
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				TableRow(
					acc.header.copy(columnNames = format.timeStampColumn +: acc.header.columnNames),
					makeTimeStamp(acc.cells(0)).toString +: acc.cells
				)
			)
			.alsoToMat(dailySitesCsvUploadCompletetionSink(format.colsMeta))(Keep.right)
	}

def dailySitesCsvUploadCompletetionSink(columnsMeta: ColumnsMeta)(implicit ctxt: ExecutionContext)
	: Sink[TableRow, Future[TimeSeriesUploadCompletion]] = {
		Flow.apply[TableRow]
			.wireTapMat(Sink.head)(Keep.right)
			.toMat(Sink.last)(getCompletionInfo(columnsMeta))
	}

	private def getCompletionInfo(columnsMeta: ColumnsMeta)(
		firstRowFut: Future[TableRow],
		lastRowFut: Future[TableRow]
	)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstRow <- firstRowFut;
			lastRow <- lastRowFut
		) yield {
			val start = Instant.parse(firstRow.cells(0))
			val stop = Instant.parse(lastRow.cells(0)).plus(1, ChronoUnit.DAYS)
			val columnNames = if (columnsMeta.hasAnyRegexCols || columnsMeta.hasOptionalColumns) Some(columnsMeta.actualColumnNames(firstRow.header.columnNames)) else None
			val ingestionExtract = TabularIngestionExtract(columnNames, TimeInterval(start, stop))
			TimeSeriesUploadCompletion(ingestionExtract, None)
		}

	private def makeTimeStamp(localDate: String): Instant = {
		val parsedTime = LocalDate.parse(localDate).atTime(LocalTime.MIN)
		parsedTime.toInstant(ZoneOffset.ofHours(1))
	}

}
