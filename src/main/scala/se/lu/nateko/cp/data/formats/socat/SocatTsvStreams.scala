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
	: Flow[String, TableRow, Future[IngestionMetadataExtract]] = Flow[String]
		.dropWhile(line => !line.contains("*/"))
		.drop(1)
		.map(_.trim.split('\t'))
		.scan(TableRow(TableRowHeader(Array.empty[String], nRows), Array.empty[String])) {
			(row, cells) =>
				if (row.header.columnNames.length == 0) {
					TableRow(
						TableRowHeader(format.timeStampColumn +: cells, nRows),
						format.timeStampColumn +: cells
					)
				} else {
					TableRow(row.header, makeTimeStamp(cells(0)).toString +: cells)
				}
		}
		.drop(2)
		.alsoToMat(socatUploadCompletionSink(format.colsMeta))(Keep.right)


	def socatUploadCompletionSink(columnsMeta: ColumnsMeta)(implicit ctxt: ExecutionContext): Sink[TableRow, Future[SpatialTimeSeriesUploadCompletion]] = {

		val completionInfoSink: Sink[TableRow, Future[TimeSeriesUploadCompletion]] = Flow.apply[TableRow]
			.wireTapMat(Sink.head)(Keep.right)
			.toMat(Sink.last)(TimeSeriesStreams.getCompletionInfo(columnsMeta))

		Flow.apply[TableRow]
			.alsoToMat(completionInfoSink)(Keep.right)
			.toMat(coverageSink) { (tsUplComplFut, coverageFut) =>
				for (
					tsUplCompl <- tsUplComplFut;
					coverage <- coverageFut
				) yield
					SpatialTimeSeriesUploadCompletion(tsUplCompl.tabular, coverage)
			}
	}

	def coverageSink(implicit ctxt: ExecutionContext): Sink[TableRow, Future[GeoFeature]] = {
		Flow.apply[TableRow].map { row =>

			val lonPos = row.header.columnNames.indexOf(LonColName)
			val latPos = row.header.columnNames.indexOf(LatColName)

			if (lonPos < 0 || latPos < 0)
				throw new CpDataParsingException(s"Expected both $LonColName and $LatColName columns to be present")

			val lon = row.cells(lonPos).toDouble
			val lat = row.cells(latPos).toDouble
			Point(lon, lat)
		}.toMat(GeoFeaturePointSink.sink)(Keep.right)
	}

	private def makeTimeStamp(timestamp: String): Instant = {
		val timestampFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME
		LocalDateTime.parse(timestamp, timestampFormatter).toInstant(ZoneOffset.UTC)
	}

}
