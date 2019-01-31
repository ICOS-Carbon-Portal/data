package se.lu.nateko.cp.data.formats.simplesitescsv

import java.time.format.DateTimeFormatter
import java.time.{Instant, LocalDateTime, ZoneOffset}

import akka.stream.scaladsl.{Flow, Keep, Sink}
import se.lu.nateko.cp.data.formats.{ColumnsMetaWithTsCol, ProperTableRow, ValueFormat}
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats.simplesitescsv.SimpleSitesCsvParser._
import se.lu.nateko.cp.meta.core.data.{IngestionMetadataExtract, TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

object SimpleSitesCsvStreams {

	def simpleSitesCsvParser(nRows: Int, format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext)
	: Flow[String, ProperTableRow, Future[IngestionMetadataExtract]] = {
		val parser = new SimpleSitesCsvParser(nRows)
		Flow.apply[String]
			.scan(parser.seed)(parseLine(format.colsMeta))
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				ProperTableRow(
					acc.header.copy(columnNames = format.timeStampColumn +: acc.header.columnNames),
					makeTimeStamp(acc.cells(0)).toString +: replaceNullValues(acc.cells, acc.formats)
				)
			)
  		.alsoToMat(uploadCompletionSink)(Keep.right)
	}

	private def uploadCompletionSink(implicit ctxt: ExecutionContext)
	: Sink[ProperTableRow, Future[TimeSeriesUploadCompletion]] =
		Flow.apply[ProperTableRow]
  	.wireTapMat(Sink.head)(Keep.right)
  	.toMat(Sink.last)(getCompletionInfo())

	private def getCompletionInfo()(
		firstRowFut: Future[ProperTableRow],
		lastRowFut: Future[ProperTableRow]
	)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstRow <- firstRowFut;
			lastRow <- lastRowFut
		) yield {
			val start = Instant.parse(firstRow.cells(0))
			val stop = Instant.parse(lastRow.cells(0))
			TimeSeriesUploadCompletion(TimeInterval(start, stop), None)
		}

	private def makeTimeStamp(timeStamp: String): Instant = {
		val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
		LocalDateTime.parse(timeStamp, isoLikeDateFormater).toInstant(ZoneOffset.ofHours(1))
	}

	private def replaceNullValues(cells: Array[String], formats: Array[Option[ValueFormat]]): Array[String] = {
		cells.zip(formats).map {
			case (cell, None) => cell
			case (cell, Some(valueFormat)) => if (isNull(cell, valueFormat)) "" else cell
		}
	}

}
