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
import java.time.{ Instant, LocalDateTime, LocalDate, LocalTime, ZoneOffset }
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeFormatterBuilder
import java.time.temporal.ChronoField

object SitesDelimitedHeaderCsvStreams extends StandardCsvStreams {

	import DelimitedHeaderCsvParser._

	private val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
	private val columnSeparator = ","
	private val headerDelimitor = "####"
	private val formatter = new DateTimeFormatterBuilder()
		.appendPattern("yyyy")
		.parseDefaulting(ChronoField.MONTH_OF_YEAR, 1)
		.parseDefaulting(ChronoField.DAY_OF_MONTH, 1)
		.toFormatter();

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == "LOD" || value == ""
		case _ => false
	}

	override def getTimestampValueFormat(colsMeta: ColumnsMeta): Option[ValueFormat] =
		colsMeta.matchColumn("TIMESTAMP")
	
	def makeTimeStamp(cells: Array[String], timestampValueFormat: Option[ValueFormat]): Instant = timestampValueFormat match {
		case Some(IsoLikeLocalDateTime) => LocalDateTime.parse(cells(0), isoLikeDateFormater).toInstant(ZoneOffset.ofHours(1))
		case Some(Iso8601Date) => LocalDate.parse(cells(0)).atTime(LocalTime.MIN).toInstant(ZoneOffset.ofHours(1))
		case Some(IntValue) => LocalDate.parse(cells(0), formatter).atTime(LocalTime.MIN).toInstant(ZoneOffset.ofHours(1))
		case _ => Instant.EPOCH
	}

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser =
		new DelimitedHeaderCsvParser(format.colsMeta, columnSeparator, headerDelimitor)

	override def acqIntervalTimeStep(timestampValueFormat: Option[ValueFormat]) = timestampValueFormat match {
		case Some(Iso8601Date) => Some(1L -> ChronoUnit.DAYS)
		case Some(IntValue) => Some(1L -> ChronoUnit.DAYS)
		case _ => None
	}

}
