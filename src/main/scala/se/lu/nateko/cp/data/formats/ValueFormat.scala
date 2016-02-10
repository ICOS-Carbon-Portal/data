package se.lu.nateko.cp.data.formats

import se.lu.nateko.cp.data.formats.bintable.ValueParser
import java.util.Locale
import se.lu.nateko.cp.data.formats.bintable.DataType
import java.time.LocalDate
import java.time.LocalTime

sealed trait ValueFormat

case object IntValue extends ValueFormat
case object FloatValue extends ValueFormat
case object StringValue extends ValueFormat
case object Iso8601DateValue extends ValueFormat
case object Iso8601TimeOfDayValue extends ValueFormat

class ValueFormatParser(locale: Locale){

	private[this] val parser = new ValueParser(locale)

	def parse(value: String, format: ValueFormat): Object = format match {
		case IntValue =>
			parser.parse(value, DataType.INT)
		case FloatValue =>
			parser.parse(value, DataType.FLOAT)
		case StringValue =>
			value
		case Iso8601DateValue =>
			Int.box(LocalDate.parse(value).toEpochDay.toInt)
		case Iso8601TimeOfDayValue =>
			Int.box(LocalTime.parse(value).toSecondOfDay)
	}
}