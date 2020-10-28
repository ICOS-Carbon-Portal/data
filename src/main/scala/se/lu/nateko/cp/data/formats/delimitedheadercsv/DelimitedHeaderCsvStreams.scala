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

class SitesDelimitedHeaderCsvStreams(colsMeta: ColumnsMeta) extends StandardCsvStreams {

	import DelimitedHeaderCsvParser._

	private val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
	private val columnSeparator = ","
	private val headerDelimitor = "####"
	private val timeStampValueFormat: Option[ValueFormat] = colsMeta.matchColumn("TIMESTAMP")

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == "LOD" || value == ""
		case IsoLikeLocalDateTime => value == "NaN"
		case _ => false
	}

	def makeTimeStamp(cells: Array[String]): Instant = timeStampValueFormat
		.collect{
			case IsoLikeLocalDateTime => LocalDateTime.parse(cells(0), isoLikeDateFormater)
			case Iso8601Date          => LocalDate    .parse(cells(0)           ).atTime(LocalTime.MIN)
			case IntValue             => LocalDate    .parse(cells(0) + "-01-01").atTime(LocalTime.MIN)
		}
		.map(_.toInstant(ZoneOffset.ofHours(1)))
		.getOrElse(Instant.EPOCH)

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser =
		new DelimitedHeaderCsvParser(format.colsMeta, columnSeparator, headerDelimitor)

	override def acqIntervalTimeStep = timeStampValueFormat.collect{
		case Iso8601Date => 1L -> ChronoUnit.DAYS
		case IntValue => 1L -> ChronoUnit.YEARS
	}

}
