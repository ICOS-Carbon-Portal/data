package se.lu.nateko.cp.data.formats.delimitedheadercsv

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Flow

import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats._
import scala.concurrent.Future
import java.time.Instant
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract
import akka.stream.scaladsl.Keep
import java.time.temporal.ChronoUnit
import java.time.{ Instant, LocalDate, LocalTime, ZoneOffset }
import java.time.format.DateTimeFormatter

object SitesDailyDelimitedHeaderCsvStreams extends StandardCsvStreams {
	import DelimitedHeaderCsvParser._

	private val columnSeparator = ","
	private val headerDelimitor = "####"

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == ""
		case _ => false
	}

	def makeTimeStamp(cells: Array[String]): Instant =
		LocalDate.parse(cells(0)).atTime(LocalTime.MIN).toInstant(ZoneOffset.ofHours(1))

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser =
		new DelimitedHeaderCsvParser(format.colsMeta, columnSeparator, headerDelimitor)

}
