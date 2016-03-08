package se.lu.nateko.cp.data.formats

import se.lu.nateko.cp.data.api.CpMetaVocab
import se.lu.nateko.cp.data.api.CpDataException

sealed trait ValueFormat

case object IntValue extends ValueFormat
case object FloatValue extends ValueFormat
case object StringValue extends ValueFormat
case object Iso8601DateValue extends ValueFormat
case object Iso8601TimeOfDayValue extends ValueFormat

object ValueFormat{

	import CpMetaVocab._

	def fromUri(uri: java.net.URI): ValueFormat = uri match {
		case `int32` => IntValue
		case `float32` => FloatValue
		case `string` => StringValue
		case `iso8601date` => Iso8601DateValue
		case `iso8601timeOfDay` => Iso8601TimeOfDayValue
		case _ => throw new CpDataException(s"Unsupported value format $uri")
	}
}

