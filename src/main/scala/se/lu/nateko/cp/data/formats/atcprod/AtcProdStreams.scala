package se.lu.nateko.cp.data.formats.atcprod

import java.time.Instant

import akka.stream.scaladsl.{Flow, Keep, Sink}
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats.atcprod.AtcProdParser._
import se.lu.nateko.cp.data.formats.{ColumnsMetaWithTsCol, ProperTableRow, ProperTableRowHeader}
import se.lu.nateko.cp.meta.core.data.{IngestionMetadataExtract, TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

object AtcProdStreams {

	def atcProdParser(format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext)
	: Flow[String, ProperTableRow, Future[IngestionMetadataExtract]] =
		Flow[String]
			.scan(seed)(parseLine)
			.exposeParsingError
			.keepGoodRows
			.map(acc => {
				val cells: Array[String] = acc.cells.zipWithIndex.map{ case (cell, index) =>
					format.colsMeta.matchColumn(acc.header.columnNames(index)) match {
						case Some(valueFormat) => if (isNull(cell, valueFormat)) "" else cell
						case None => cell
					}
				}
				ProperTableRow(
					ProperTableRowHeader(format.timeStampColumn +: acc.header.columnNames, acc.header.nRows),
					makeTimeStamp(acc.cells, acc.header.columnNames).toString +: cells
				)
			})
			.alsoToMat(atcProdUploadCompletionSink)(Keep.right)

	private def atcProdUploadCompletionSink(implicit ctxt: ExecutionContext)
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
			TimeSeriesUploadCompletion(TimeInterval(start, stop), Some(firstRow.header.nRows))
		}

	private def makeTimeStamp(cells: Array[String], columnNames: Array[String]): Instant = {
		val timeIndices = Seq("Year", "Month", "Day", "Hour", "Minute", "Second").map(columnNames.indexOf)

		def pad0(s: String) = if (s.length == 1) "0" + s else s

		val Seq(year, month, day, hour, min, sec) = timeIndices.map { idx =>
			if (idx >= 0) pad0(cells(idx)) else "00"
		}
		Instant.parse(s"$year-$month-${day}T$hour:$min:${sec}Z")
	}
}
