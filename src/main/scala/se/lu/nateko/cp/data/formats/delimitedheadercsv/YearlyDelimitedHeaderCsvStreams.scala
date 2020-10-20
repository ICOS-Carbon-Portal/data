package se.lu.nateko.cp.data.formats.delimitedheadercsv

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Flow

import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats._
import scala.concurrent.Future
import java.time.Instant
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract
import akka.stream.scaladsl.Keep
import java.time.temporal.{ ChronoUnit, ChronoField}
import java.time.{ Instant, LocalDate, LocalTime, ZoneOffset }
import java.time.format.{ DateTimeFormatter, DateTimeFormatterBuilder }

object SitesYearlyDelimitedHeaderCsvStreams extends StandardCsvStreams {
	import DelimitedHeaderCsvParser._

	private val formatter = new DateTimeFormatterBuilder()
		.appendPattern("yyyy")
		.parseDefaulting(ChronoField.MONTH_OF_YEAR, 1)
		.parseDefaulting(ChronoField.DAY_OF_MONTH, 1)
		.toFormatter();
	private val columnSeparator = ","
	private val headerDelimitor = "####"

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == "LOD" || value == ""
		case _ => false
	}

	def makeTimeStamp(cells: Array[String]): Instant =
		LocalDate.parse(cells(0), formatter).atTime(LocalTime.MIN).toInstant(ZoneOffset.ofHours(1))

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser =
		new DelimitedHeaderCsvParser(format.colsMeta, columnSeparator, headerDelimitor)

	override def acqIntervalTimeStep = Some(1L -> ChronoUnit.YEARS)

}
