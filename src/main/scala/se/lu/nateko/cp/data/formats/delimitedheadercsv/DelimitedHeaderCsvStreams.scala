package se.lu.nateko.cp.data.formats.delimitedheadercsv


import se.lu.nateko.cp.data.formats.*
import java.time.temporal.ChronoUnit
import java.time.{ Instant, LocalDateTime, LocalDate, LocalTime, ZoneOffset, YearMonth }
import java.time.format.DateTimeFormatter
import ValueFormat.*

class SitesDelimitedHeaderCsvStreams(colsMeta: ColumnsMeta) extends StandardCsvStreams {

	private val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
	private val columnSeparator = ","
	private val headerDelimitor = "####"
	private val timeStampValueFormat: Option[ValueFormat] = colsMeta.matchColumn("TIMESTAMP")

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == "LOD" || value == ""
		case IsoLikeLocalDateTime => value == "NaN"
		case Iso8601Date => value == "N/A"
		case Iso8601Month => value == "N/A"
		case IntValue => value == "N/A" || value == "LOD"
		case BooleanValue => value == "N/A"
		case _ => false
	}

	def makeTimeStamp(cells: Array[String]): Instant = timeStampValueFormat
		.collect{
			case IsoLikeLocalDateTime => LocalDateTime.parse(cells(0), isoLikeDateFormater)
			case Iso8601Date          => LocalDate    .parse(cells(0)           ).atTime(LocalTime.MIN)
			case Iso8601Month         => LocalDate    .parse(cells(0) +    "-01").atTime(LocalTime.MIN)
			case IntValue             => LocalDate    .parse(cells(0) + "-01-01").atTime(LocalTime.MIN)
		}
		.map(_.toInstant(ZoneOffset.ofHours(1)))
		.getOrElse(Instant.EPOCH)

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser =
		new DelimitedHeaderCsvParser(format.colsMeta, columnSeparator, headerDelimitor)

	override def acqIntervalTimeStep = timeStampValueFormat.collect{
		case Iso8601Date => 1L -> ChronoUnit.DAYS
		case Iso8601Month => 1L -> ChronoUnit.MONTHS
		case IntValue => 1L -> ChronoUnit.YEARS
	}

}
