package se.lu.nateko.cp.data.formats

import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.bintable.DataType

import java.time.*
import java.time.format.DateTimeFormatter

object ValueFormatParser:
	import ValueFormat.*

	val etcDateFormatter = DateTimeFormatter.ofPattern("d/M/yyyy")
	val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
	val etcDateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmm")

	def parse(value: String, format: ValueFormat): AnyRef =
		try{
			parseInner(value, format)
		} catch{
			case err: Throwable =>
				throw new CpDataParsingException(s"Could not parse '$value' as $format : ${err.getMessage}")
		}

	private def parseFloat(value: String) =
		val flt = value.toFloat
		if flt.isInfinite() then throw new NumberFormatException(value + " is outside the range for Float.")
		else flt

	private def parseDouble(value: String) =
		val dbl = value.toDouble
		if dbl.isInfinite() then throw new NumberFormatException(value + " is outside the range for Double.")
		else dbl

	private def parseInner(value: String, format: ValueFormat): AnyRef =
		if (value == null || value.trim.isEmpty) getNullRepresentation(format)
		else format match {
			case IntValue =>
				Int.box(Integer.parseInt(value))
			case FloatValue =>
				Float.box(parseFloat(value))
			case DoubleValue =>
				Double.box(parseDouble(value))
			case Utf16CharValue =>
				Character.valueOf(value.charAt(0))
			case StringValue =>
				value
			case Iso8601Date =>
				encodeLocalDate(LocalDate.parse(value))
			case Iso8601Month =>
				val ym = YearMonth.parse(value)
				Int.box(ym.getYear * 12 + ym.getMonthValue - 1)
			case EtcDate =>
				encodeLocalDate(LocalDate.parse(value, etcDateFormatter))
			case Iso8601DateTime =>
				encodeInstant(Instant.parse(value))
			case Iso8601TimeOfDay =>
				if (value.startsWith("24:")) {
					val residualTime = "00:" + value.substring(3)
					Int.box(isoTimeOfDayToBin(residualTime) + 86400)
				}
				else if (value.charAt(1) == ':') isoTimeOfDayToBin("0" + value)
				else isoTimeOfDayToBin(value)
			case IsoLikeLocalDateTime =>
				localDateTimeToBin(value, isoLikeDateFormater)
			case EtcLocalDateTime =>
				localDateTimeToBin(value, etcDateTimeFormatter)
			case BooleanValue =>
				Byte.box(if value.toBoolean then 1 else 0)
		}

	private def isoTimeOfDayToBin(time: String): Integer = encodeLocalTime(LocalTime.parse(time))
	private def localDateTimeToBin(value: String, formatter: DateTimeFormatter): java.lang.Double =
		encodeLocalDateTime(LocalDateTime.parse(value, formatter))

	def encodeLocalDate(ld: LocalDate): Integer = Int.box(ld.toEpochDay.toInt)
	def encodeLocalTime(lt: LocalTime): Integer = Int.box(lt.toSecondOfDay)
	inline def encodeInstant(epochMillis: Long): java.lang.Double = Double.box(epochMillis.toDouble)
	def encodeInstant(inst: Instant): java.lang.Double = encodeInstant(inst.toEpochMilli)
	def encodeLocalDateTime(dt: LocalDateTime): java.lang.Double =
		Double.box(dt.toInstant(ZoneOffset.UTC).toEpochMilli.toDouble)

	def getBinTableDataType(format: ValueFormat): DataType = format match {
		case IntValue => DataType.INT
		case FloatValue => DataType.FLOAT
		case DoubleValue => DataType.DOUBLE
		case Utf16CharValue => DataType.CHAR
		case StringValue => DataType.STRING
		case BooleanValue => DataType.BYTE
		case Iso8601Month => DataType.INT
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
		case BooleanValue => Byte.box(Byte.MinValue)
		case Iso8601Month => Int.box(Int.MinValue)
		case Iso8601Date | EtcDate => Int.box(Int.MinValue)
		case Iso8601DateTime | IsoLikeLocalDateTime | EtcLocalDateTime => Double.box(Double.NaN)
		case Iso8601TimeOfDay => Int.box(Int.MinValue)
	}

	def numCsvSerializer(format: ValueFormat): AnyVal => String = {

		val ser: AnyVal => String = format match {

			case Iso8601Month =>
				v => {
					val num = v.asInstanceOf[Int]
					val year = num / 12
					val month = num % 12 + 1
					YearMonth.of(year, month).toString
				}

			case Iso8601Date | EtcDate =>
				v => LocalDate.ofEpochDay(v.asInstanceOf[Int].toLong).toString

			case Iso8601DateTime | IsoLikeLocalDateTime | EtcLocalDateTime =>
				v => Instant.ofEpochMilli(v.asInstanceOf[Double].toLong).toString

			case Iso8601TimeOfDay =>
				v => LocalTime.ofSecondOfDay(v.asInstanceOf[Int].toLong % 86400).toString

			case Utf16CharValue | IntValue | StringValue | FloatValue | DoubleValue | BooleanValue =>
				v => v.toString
		}

		val nullTest: AnyVal => Boolean = getBinTableDataType(format) match{
			case DataType.FLOAT =>
				v => (v.asInstanceOf[Float] != v.asInstanceOf[Float])
			case DataType.DOUBLE =>
				v => (v.asInstanceOf[Double] != v.asInstanceOf[Double])
			case _ =>
				val nullRepr = getNullRepresentation(format)
				v => nullRepr == v
		}

		v => if(nullTest(v)) "" else ser(v)
	}

end ValueFormatParser
