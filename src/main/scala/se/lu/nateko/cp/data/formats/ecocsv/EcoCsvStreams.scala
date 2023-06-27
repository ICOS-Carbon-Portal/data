package se.lu.nateko.cp.data.formats.ecocsv

import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import se.lu.nateko.cp.data.formats.TimeSeriesStreams.*
import se.lu.nateko.cp.data.formats.*
import se.lu.nateko.cp.data.services.upload.IngestionUploadTask.RowParser
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract

import java.time.*
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

object EcoCsvStreams:

	def ecoCsvParser(nRows: Int, format: ColumnsMetaWithTsCol)(using ExecutionContext): RowParser =
		val parser = new EcoCsvParser

		Flow.apply[String]
			.scan(parser.seed)(parser.parseLine(format.colsMeta))
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				TableRow(
					TableRowHeader(format.timeStampColumn +: acc.columnNames, nRows),
					makeTimeStamp(acc.cells(0), acc.cells(1), acc.offsetFromUtc).toString +: replaceNullValues(acc.cells, acc.formats)
				)
			)
			.alsoToMat(
				digestSink(getCompletionInfo(format.colsMeta))
			)(Keep.right)
	end ecoCsvParser

	private def makeTimeStamp(localDate: String, localTime: String, offsetFromUtc: Int): Instant = {
		val date = ValueFormatParser.parse(localDate, ValueFormat.EtcDate).asInstanceOf[Int]
		val time = ValueFormatParser.parse(localTime, ValueFormat.Iso8601TimeOfDay).asInstanceOf[Int]
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

end EcoCsvStreams
