package se.lu.nateko.cp.data.formats.otc

import akka.NotUsed
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.TimeSeriesStreams.*
import se.lu.nateko.cp.data.formats.*
import se.lu.nateko.cp.data.formats.csv.CsvParser
import se.lu.nateko.cp.data.services.upload.IngestionUploadTask.RowParser
import se.lu.nateko.cp.data.streams.geo.GeoFeaturePointSink
import se.lu.nateko.cp.data.streams.geo.Point
import se.lu.nateko.cp.meta.core.data.*

import java.time.*
import java.time.format.DateTimeFormatter
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Success
import scala.util.Try

object OtcCsvStreams {

	val LonColName = "Longitude"
	val LonFlagColName = "Longitude QC Flag"
	val LatColName = "Latitude"
	val LatFlagColName = "Latitude QC Flag"
	private val csvParser = CsvParser.default

	def socatTsvParser(nRows: Int, format: ColumnsMetaWithTsCol)(using ExecutionContext): RowParser = Flow[String]
		.dropWhile(line => !line.contains("*/"))
		.drop(1)
		.map(_.trim.split("\t", -1))
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
		.filter(row => !hasLatLonQualityFlag(row))
		.alsoToMat(uploadCompletionSink(format.colsMeta))(Keep.right)

	def otcProductParser(nRows: Int, format: ColumnsMetaWithTsCol)(using ExecutionContext): RowParser = Flow[String]
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

	def uploadCompletionSink(columnsMeta: ColumnsMeta)(using ExecutionContext): Sink[TableRow, Future[IngestionMetadataExtract]] = {
		val tabularExtractSink = digestSink(getCompletionInfo(columnsMeta))

		if(columnsMeta.matchesColumn(LatColName) && columnsMeta.matchesColumn(LonColName))
			Flow.apply[TableRow]
				.alsoToMat(tabularExtractSink)(Keep.right)
				.toMat(coverageSink(ignoreErrors = true)) { (tsUplComplFut, coverageFut) =>
					for (
						tsUplCompl <- tsUplComplFut;
						coverage <- coverageFut
					) yield
						SpatialTimeSeriesExtract(tsUplCompl.tabular, coverage)
				}
		else
			Flow.apply[TableRow].toMat(tabularExtractSink)(Keep.right)
	}

	def coverageSink(ignoreErrors: Boolean)(using ExecutionContext): Sink[TableRow, Future[GeoFeature]] = {
		val pointsParser: Flow[TableRow, Point, NotUsed] =
			if(ignoreErrors) Flow.apply[TableRow].mapConcat(parseLatLon(_).toOption)
			else Flow.apply[TableRow].map(parseLatLon(_).get)

		pointsParser.toMat(GeoFeaturePointSink.sink)(Keep.right)
	}

	private def makeSocatTimeStamp(timestamp: String): Instant = {
		val timestampFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME
		LocalDateTime.parse(timestamp, timestampFormatter).toInstant(ZoneOffset.UTC)
	}

	def parseLatLon(row: TableRow): Try[Point] =
		val lonPos = row.header.columnNames.indexOf(LonColName)
		val latPos = row.header.columnNames.indexOf(LatColName)

		if (lonPos < 0 || latPos < 0)
			parseFail(s"Expected both $LonColName and $LatColName columns to be present in row $row")
		else
			try
				val lon = row.cells(lonPos).toDouble
				val lat = row.cells(latPos).toDouble
				Success(Point(lon, lat))
			catch
				case err: Throwable =>
					parseFail(s"Problem parsing lat/lon values in row $row\nError message: ${err.getMessage}")

	def parseFail(msg: String) = scala.util.Failure(new CpDataParsingException(msg))

	private def hasLatLonQualityFlag(row: TableRow): Boolean =
		val lonQualityFlagPos = row.header.columnNames.indexOf(LonFlagColName)
		val latQualityFlagPos = row.header.columnNames.indexOf(LatFlagColName)
		val hasLonQualityFlag = hasPresentFieldValue(row, lonQualityFlagPos)
		val hasLatQualityFlag = hasPresentFieldValue(row, latQualityFlagPos)
		hasLonQualityFlag || hasLatQualityFlag

	private def hasPresentFieldValue(row: TableRow, fieldPosition: Int): Boolean =
		if (fieldPosition < 0)
			false
		else
			val fieldValue = row.cells(fieldPosition).toString
			!fieldValue.replaceAll("\"", "").trim.isEmpty
}
