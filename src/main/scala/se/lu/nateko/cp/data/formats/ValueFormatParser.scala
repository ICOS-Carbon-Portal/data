package se.lu.nateko.cp.data.formats

import java.time._
import se.lu.nateko.cp.data.formats.bintable.DataType
import se.lu.nateko.cp.data.formats.bintable.ValueParser
import java.time.format.DateTimeFormatter

class ValueFormatParser {

	import ValueFormatParser._

	private[this] val parser = new ValueParser

	def parse(value: String, format: ValueFormat): AnyRef =
		if (value == "") getNullRepresentation(format)
		else format match {
			case IntValue =>
				parser.parse(value, DataType.INT)
			case FloatValue =>
				parser.parse(value, DataType.FLOAT)
			case DoubleValue =>
				parser.parse(value, DataType.DOUBLE)
			case Utf16CharValue =>
				Character.valueOf(value.charAt(0))
			case StringValue =>
				value
			case Iso8601Date =>
				Int.box(LocalDate.parse(value).toEpochDay.toInt)
			case EtcDate =>
				Int.box(LocalDate.parse(value, etcDateFormatter).toEpochDay.toInt)
			case Iso8601DateTime =>
				Double.box(Instant.parse(value).toEpochMilli.toDouble)
			case Iso8601TimeOfDay =>
				if (value.startsWith("24:")) {
					val residualTime = "00:" + value.substring(3)
					Int.box(86400 + LocalTime.parse(residualTime).toSecondOfDay)
				}
				else if (value.charAt(1) == ':') parseIsoTimeOfDay("0" + value)
				else parseIsoTimeOfDay(value)
			case IsoLikeLocalDateTime =>
				parseLocalDateTime(value, isoLikeDateFormater)
			case EtcLocalDateTime =>
				parseLocalDateTime(value, etcDateTimeFormatter)
		}

	def getBinTableDataType(format: ValueFormat): DataType = format match {
		case IntValue => DataType.INT
		case FloatValue => DataType.FLOAT
		case DoubleValue => DataType.DOUBLE
		case Utf16CharValue => DataType.CHAR
		case StringValue => DataType.STRING
		case Iso8601Date | EtcDate => DataType.INT
		case Iso8601DateTime | IsoLikeLocalDateTime | EtcLocalDateTime => DataType.DOUBLE
		case Iso8601TimeOfDay => DataType.INT
	}

	def getNullRepresentation(format: ValueFormat): AnyRef = format match {
		case IntValue => Int.box(Int.MinValue)
		case FloatValue => Float.box(Float.NaN)
		case DoubleValue => Double.box(Double.NaN)
		case Utf16CharValue => Character.valueOf(Character.MIN_VALUE)
		case StringValue => ""
		case Iso8601Date | EtcDate => Int.box(Int.MinValue)
		case Iso8601DateTime | IsoLikeLocalDateTime | EtcLocalDateTime => Double.box(Double.NaN)
		case Iso8601TimeOfDay => Int.box(Int.MinValue)
	}
}

object ValueFormatParser {
	val etcDateFormatter = DateTimeFormatter.ofPattern("d/M/yyyy")
	val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
	val etcDateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmm")

	def parseIsoTimeOfDay(time: String): Integer =
		Int.box(LocalTime.parse(time).toSecondOfDay)

	def parseLocalDateTime(value: String, formatter: DateTimeFormatter): java.lang.Double =
		Double.box(LocalDateTime.parse(value, formatter).toInstant(ZoneOffset.UTC).toEpochMilli.toDouble)
}
