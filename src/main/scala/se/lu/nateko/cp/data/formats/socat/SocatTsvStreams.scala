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

	def socatTsvParser(nRows: Int, timeStampColumn: String)(implicit ctxt: ExecutionContext)
	: Flow[String, ProperTableRow, Future[IngestionMetadataExtract]] = Flow[String]
		.dropWhile(line => !line.contains("*/"))
		.drop(1)
		.map(_.trim.split('\t'))
		.scan(ProperTableRow(ProperTableRowHeader(Array.empty[String], nRows), Array.empty[String])) {
			(row, cells) =>
				if (row.header.columnNames.length == 0) {
					ProperTableRow(ProperTableRowHeader(timeStampColumn +: cells, nRows), timeStampColumn +: cells)
				} else {
					ProperTableRow(row.header, makeTimeStamp(cells(0)).toString +: cells)
				}
		}
		.drop(2)
		.alsoToMat(socatUploadCompletionSink)(Keep.right)


	def socatUploadCompletionSink(implicit ctxt: ExecutionContext): Sink[ProperTableRow, Future[SpatialTimeSeriesUploadCompletion]] = {

		val completionInfoSink: Sink[ProperTableRow, Future[TimeSeriesUploadCompletion]] = Flow.apply[ProperTableRow]
			.wireTapMat(Sink.head)(Keep.right)
			.toMat(Sink.last)(getCompletionInfo())

		Flow.apply[ProperTableRow]
			.alsoToMat(completionInfoSink)(Keep.right)
			.toMat(coverageSink) { (tsUplComplFut, coverageFut) =>
				for (
					tsUplCompl <- tsUplComplFut;
					coverage <- coverageFut
				) yield
					SpatialTimeSeriesUploadCompletion(tsUplCompl.interval, coverage)
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

	private def getCompletionInfo()(
		firstBinFut: Future[ProperTableRow],
		lastBinFut: Future[ProperTableRow]
	)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield {
			val start = Instant.parse(firstBin.cells(0))
			val stop = Instant.parse(lastBin.cells(0))
			TimeSeriesUploadCompletion(TimeInterval(start, stop), None)
		}

	private def makeTimeStamp(timestamp: String): Instant = {
		val timestampFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME
		LocalDateTime.parse(timestamp, timestampFormatter).toInstant(ZoneOffset.UTC)
	}

}
