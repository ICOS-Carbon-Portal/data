package se.lu.nateko.cp.data.formats.ecocsv

import java.time._
import java.util.Locale

import akka.stream.scaladsl.{Flow, Keep, Sink}
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.meta.core.data.{IngestionMetadataExtract, TabularIngestionExtract, TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

object EcoCsvStreams {

	protected val valueFormatParser = new ValueFormatParser(Locale.UK)

	def ecoCsvParser(nRows: Int, format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext)
	: Flow[String, TableRow, Future[IngestionMetadataExtract]] = {
		val parser = new EcoCsvParser(nRows)

		Flow.apply[String]
			.scan(parser.seed)(parser.parseLine(format.colsMeta))
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				TableRow(
					TableRowHeader(format.timeStampColumn +: acc.columnNames, acc.nRows),
					makeTimeStamp(acc.cells(0), acc.cells(1), acc.offsetFromUtc).toString +: replaceNullValues(acc.cells, acc.formats)
				)
			)
  		.alsoToMat(ecoCsvUploadCompletionSink(format.colsMeta))(Keep.right)
	}

	def ecoCsvUploadCompletionSink(columnsMeta: ColumnsMeta)(implicit ctxt: ExecutionContext): Sink[TableRow, Future[TimeSeriesUploadCompletion]] = {
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
			val stop = Instant.parse(lastRow.cells(0))
			val columnNames = if (columnsMeta.hasAnyRegexCols || columnsMeta.hasOptionalColumns) Some(columnsMeta.actualColumnNames(firstRow.header.columnNames)) else None
			val ingestionExtract = TabularIngestionExtract(columnNames, TimeInterval(start, stop))
			TimeSeriesUploadCompletion(ingestionExtract, None)
		}

	private def makeTimeStamp(localDate: String, localTime: String, offsetFromUtc: Int): Instant = {
		val date = valueFormatParser.parse(localDate, EtcDate).asInstanceOf[Int]
		val time = valueFormatParser.parse(localTime, Iso8601TimeOfDay).asInstanceOf[Int]
		val locDate = LocalDate.ofEpochDay(date.toLong)

		val dt =
			if(time >= 86400){
				val locTime = LocalTime.ofSecondOfDay((time - 86400).toLong)
				LocalDateTime.of(locDate, locTime).plusHours((24 - offsetFromUtc).toLong)
			} else {
				val locTime = LocalTime.ofSecondOfDay(time.toLong)
				LocalDateTime.of(locDate, locTime).minusHours(offsetFromUtc.toLong)
			}
		dt.toInstant(ZoneOffset.UTC)
	}

	private def replaceNullValues(cells: Array[String], formats: Array[Option[ValueFormat]]): Array[String] = {
		import EcoCsvParser._

		cells.zip(formats).map {
			case (cell, None) => cell
			case (cell, Some(valueFormat)) => if (isNull(cell, valueFormat)) "" else cell
		}
	}

}
