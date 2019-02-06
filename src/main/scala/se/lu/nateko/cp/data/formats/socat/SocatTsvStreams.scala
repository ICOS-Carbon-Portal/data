package se.lu.nateko.cp.data.formats.socat

import java.time._
import java.time.format.DateTimeFormatter

import akka.stream.scaladsl.{Flow, Keep, Sink}
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.streams.geo.{GeoFeaturePointSink, Point}
import se.lu.nateko.cp.meta.core.data._

import scala.concurrent.{ExecutionContext, Future}

object SocatTsvStreams {

	val LonColName = "Longitude"
	val LatColName = "Latitude"

	def socatTsvParser(nRows: Int, format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext)
	: Flow[String, ProperTableRow, Future[IngestionMetadataExtract]] = Flow[String]
		.dropWhile(line => !line.contains("*/"))
		.drop(1)
		.map(_.trim.split('\t'))
		.scan(ProperTableRow(ProperTableRowHeader(Array.empty[String], nRows), Array.empty[String])) {
			(row, cells) =>
				if (row.header.columnNames.length == 0) {
					ProperTableRow(
						ProperTableRowHeader(format.timeStampColumn +: cells, nRows),
						format.timeStampColumn +: cells
					)
				} else {
					ProperTableRow(row.header, makeTimeStamp(cells(0)).toString +: cells)
				}
		}
		.drop(2)
		.alsoToMat(socatUploadCompletionSink(format.colsMeta))(Keep.right)


	def socatUploadCompletionSink(columnsMeta: ColumnsMeta)(implicit ctxt: ExecutionContext): Sink[ProperTableRow, Future[SpatialTimeSeriesUploadCompletion]] = {

		val completionInfoSink: Sink[ProperTableRow, Future[TimeSeriesUploadCompletion]] = Flow.apply[ProperTableRow]
			.wireTapMat(Sink.head)(Keep.right)
			.toMat(Sink.last)(getCompletionInfo(columnsMeta))

		Flow.apply[ProperTableRow]
			.alsoToMat(completionInfoSink)(Keep.right)
			.toMat(coverageSink) { (tsUplComplFut, coverageFut) =>
				for (
					tsUplCompl <- tsUplComplFut;
					coverage <- coverageFut
				) yield
					SpatialTimeSeriesUploadCompletion(tsUplCompl.tabular, coverage)
			}
	}

	def coverageSink(implicit ctxt: ExecutionContext): Sink[ProperTableRow, Future[GeoFeature]] = {
		Flow.apply[ProperTableRow].map { row =>

			val lonPos = row.header.columnNames.indexOf(LonColName)
			val latPos = row.header.columnNames.indexOf(LatColName)

			if (lonPos < 0 || latPos < 0)
				throw new CpDataParsingException(s"Expected both $LonColName and $LatColName columns to be present")

			val lon = row.cells(lonPos).toDouble
			val lat = row.cells(latPos).toDouble
			Point(lon, lat)
		}.toMat(GeoFeaturePointSink.sink)(Keep.right)
	}

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
			TimeSeriesUploadCompletion(ingestionExtract, None)
		}

	private def makeTimeStamp(timestamp: String): Instant = {
		val timestampFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME
		LocalDateTime.parse(timestamp, timestampFormatter).toInstant(ZoneOffset.UTC)
	}

}
