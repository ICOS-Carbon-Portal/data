package se.lu.nateko.cp.data.formats.atcprod

import java.time.Instant

import akka.stream.scaladsl.{Flow, Keep, Sink}
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.meta.core.data.{IngestionMetadataExtract, TabularIngestionExtract, TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

object AtcProdStreams {
	import AtcProdParser._

	def atcProdParser(format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext)
	: Flow[String, ProperTableRow, Future[IngestionMetadataExtract]] =
		Flow[String]
			.scan(seed)(parseLine(format.colsMeta))
			.exposeParsingError
			.keepGoodRows
			.map(acc => {
				ProperTableRow(
					ProperTableRowHeader(format.timeStampColumn +: acc.header.columnNames, acc.header.nRows),
					makeTimeStamp(acc.cells, acc.header.columnNames).toString +: replaceNullValues(acc.cells, acc.formats)
				)
			})
			.alsoToMat(uploadCompletionSink(format.colsMeta))(Keep.right)

	private def uploadCompletionSink(columnsMeta: ColumnsMeta)(implicit ctxt: ExecutionContext)
	: Sink[ProperTableRow, Future[TimeSeriesUploadCompletion]] =
		Flow.apply[ProperTableRow]
			.wireTapMat(Sink.head)(Keep.right)
			.toMat(Sink.last)(getCompletionInfo(columnsMeta))

	private def getCompletionInfo(columnsMeta: ColumnsMeta)(
		firstRowFut: Future[ProperTableRow],
		lastRowFut: Future[ProperTableRow]
	)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstRow <- firstRowFut;
			lastRow <- lastRowFut
		) yield {
			val start = Instant.parse(firstRow.cells(0))
			val stop = Instant.parse(lastRow.cells(0))
			val columnNames = if (columnsMeta.hasAnyRegexCols || columnsMeta.hasOptionalColumns) Some(columnsMeta.actualColumnNames(firstRow.header.columnNames)) else None
			val ingestionExtract = TabularIngestionExtract(columnNames, TimeInterval(start, stop))
			TimeSeriesUploadCompletion(ingestionExtract, Some(firstRow.header.nRows))
		}

	private def makeTimeStamp(cells: Array[String], columnNames: Array[String]): Instant = {
		val timeIndices = Seq("Year", "Month", "Day", "Hour", "Minute", "Second").map(columnNames.indexOf)

		def pad0(s: String) = if (s.length == 1) "0" + s else s

		val Seq(year, month, day, hour, min, sec) = timeIndices.map { idx =>
			if (idx >= 0) pad0(cells(idx)) else "00"
		}
		Instant.parse(s"$year-$month-${day}T$hour:$min:${sec}Z")
	}

	private def replaceNullValues(cells: Array[String], formats: Array[Option[ValueFormat]]): Array[String] = {
		cells.zip(formats).map {
			case (cell, None) => cell
			case (cell, Some(valueFormat)) => if (isNull(cell, valueFormat)) "" else cell
		}
	}
}
