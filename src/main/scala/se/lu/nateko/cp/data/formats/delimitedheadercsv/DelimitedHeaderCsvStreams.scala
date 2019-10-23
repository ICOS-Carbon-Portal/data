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
import java.time.{ Instant, LocalDateTime, ZoneOffset }
import java.time.format.DateTimeFormatter

object SitesDelimitedHeaderCsvStreams extends StandardCsvStreams {
	import DelimitedHeaderCsvParser._

	private val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
	private val columnSeparator = ","
	private val headerDelimitor = "####"

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == ""
		case _ => false
	}

	def makeTimeStamp(cells: Array[String]): Instant =
		LocalDateTime.parse(cells(0), isoLikeDateFormater).toInstant(ZoneOffset.ofHours(1))

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser =
		new DelimitedHeaderCsvParser(format.colsMeta, columnSeparator, headerDelimitor)

}