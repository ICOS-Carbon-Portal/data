package se.lu.nateko.cp.data.formats.otc

import java.time._
import java.time.format.DateTimeFormatter

import akka.stream.scaladsl.{Flow, Keep, Sink}
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.csv.CsvParser
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.services.upload.IngestionUploadTask.RowParser
import se.lu.nateko.cp.data.streams.geo.{GeoFeaturePointSink, Point}
import se.lu.nateko.cp.meta.core.data._

import scala.concurrent.{ExecutionContext, Future}

object OtcCsvStreams {

	val LonColName = "Longitude"
	val LatColName = "Latitude"
	private val csvParser = CsvParser.default

	def socatTsvParser(nRows: Int, format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext): RowParser = Flow[String]
		.dropWhile(line => !line.contains("*/"))
		.drop(1)
		.map(_.trim.split('\t'))
		.scan(TableRow.empty(nRows)) {
			(row, cells) =>
				if (row.header.columnNames.length == 0) {
					TableRow(
						TableRowHeader(format.timeStampColumn +: cells, nRows),
						format.timeStampColumn +: cells
					)
				} else {
					TableRow(row.header, makeSocatTimeStamp(cells(0)).toString +: cells)
				}
		}
		.drop(2)
		.alsoToMat(uploadCompletionSink(format.colsMeta))(Keep.right)

	def otcProductParser(nRows: Int, format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext): RowParser = Flow[String]
		.scan(CsvParser.seed)((acc, line) => csvParser.parseLine(acc, line))
		.collect{
			case acc if acc.lastState == CsvParser.Init && acc.cells.length > 0 => acc.cells
		}
		.scan(TableRow.empty(nRows)) {
			(row, cells) =>
				if (row.header.columnNames.length == 0) {
					TableRow(
						TableRowHeader(format.timeStampColumn +: cells.tail, nRows), //first column is the ISO UTC timestamp
						cells
					)
				} else TableRow(row.header, cells)
		}
		.drop(2)
		.alsoToMat(uploadCompletionSink(format.colsMeta))(Keep.right)

	def uploadCompletionSink(columnsMeta: ColumnsMeta)(implicit ctxt: ExecutionContext): Sink[TableRow, Future[IngestionMetadataExtract]] = {
		val tabularExtractSink = digestSink(getCompletionInfo(columnsMeta))

		if(columnsMeta.matchesColumn(LatColName) && columnsMeta.matchesColumn(LonColName))
			Flow.apply[TableRow]
				.alsoToMat(tabularExtractSink)(Keep.right)
				.toMat(coverageSink) { (tsUplComplFut, coverageFut) =>
					for (
						tsUplCompl <- tsUplComplFut;
						coverage <- coverageFut
					) yield
						SpatialTimeSeriesExtract(tsUplCompl.tabular, coverage)
				}
		else
			Flow.apply[TableRow].toMat(tabularExtractSink)(Keep.right)
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

	private def makeSocatTimeStamp(timestamp: String): Instant = {
		val timestampFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME
		LocalDateTime.parse(timestamp, timestampFormatter).toInstant(ZoneOffset.UTC)
	}

}
