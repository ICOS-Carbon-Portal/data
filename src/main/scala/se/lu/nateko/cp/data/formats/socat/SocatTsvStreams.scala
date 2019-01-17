package se.lu.nateko.cp.data.formats.socat

import java.time._

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import akka.{Done, NotUsed}
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.socat.SocatTsvToBinTableConverter.parseTimestamp
import se.lu.nateko.cp.data.streams.geo.GeoFeaturePointSink
import se.lu.nateko.cp.data.streams.geo.Point
import se.lu.nateko.cp.meta.core.data.{GeoFeature, SpatialTimeSeriesUploadCompletion, TimeInterval, TimeSeriesUploadCompletion}

object SocatTsvStreams {

	val LonColName = "Longitude"
	val LatColName = "Latitude"

	def socatTsvParser(nRows: Int): Flow[String, ProperTableRow, Future[Done]] = Flow[String]
		.dropWhile(line => !line.contains("*/"))
		.drop(1)
		.map(_.trim.split('\t'))
		.scan(ProperTableRow(ProperTableRowHeader(Array.empty[String], nRows), Array.empty[String])) { (row, cells) =>
			val header = if (row.header.columnNames.length == 0)
				ProperTableRowHeader(cells, nRows)
			else row.header
				ProperTableRow(header, cells)
		}
		.drop(2)
		.alsoToMat(Sink.ignore)(Keep.right)


	def socatUploadCompletionSink(
		formats: ColumnsMetaWithTsCol
	)(implicit ctxt: ExecutionContext): Sink[ProperTableRow, Future[SpatialTimeSeriesUploadCompletion]] = {

		val completionInfoSink: Sink[ProperTableRow, Future[TimeSeriesUploadCompletion]] = Flow.apply[ProperTableRow]
			.wireTapMat(Sink.head)(Keep.right)
			.toMat(Sink.last)(getCompletionInfo())

		Flow.apply[ProperTableRow]
			.alsoToMat(completionInfoSink)(Keep.right)
			.toMat(coverageSink(formats)) { (tsUplComplFut, coverageFut) =>
				for (
					tsUplCompl <- tsUplComplFut;
					coverage <- coverageFut
				) yield
					SpatialTimeSeriesUploadCompletion(tsUplCompl.interval, coverage)
			}
	}

	def socatTsvToBinTableConverter(formats: ColumnsMetaWithTsCol): Flow[ProperTableRow, BinTableRow, NotUsed] = {
		val converter = new SocatTsvToBinTableConverter(formats.colsMeta)
		Flow.apply[ProperTableRow].map(converter.parseRow)
	}

	def coverageSink(colFormats: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext): Sink[ProperTableRow, Future[GeoFeature]] = {
		Flow.apply[ProperTableRow].map { row =>

			val valueFormats: Map[String, ValueFormat] = row.header.columnNames.flatMap { cname =>
				colFormats.colsMeta.matchColumn(cname)
					.map(valueFormat => cname -> valueFormat) //Option[String -> ValueFormat]
			}.toMap

			val sortedColumns = valueFormats.keys.toArray.sorted
			val lonPos = sortedColumns.indexOf(LonColName)
			val latPos = sortedColumns.indexOf(LatColName)

			if (lonPos < 0 || latPos < 0)
				throw new CpDataParsingException("Expected both $LonColName and $LatColName columns to be present")

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
			val start = parseTimestamp(firstBin.cells(0))
			val stop = parseTimestamp(lastBin.cells(0))
			TimeSeriesUploadCompletion(TimeInterval(start, stop), None)
		}

}
