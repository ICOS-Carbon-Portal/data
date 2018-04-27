package se.lu.nateko.cp.data.formats

import se.lu.nateko.cp.data.api.CpMetaVocab
import se.lu.nateko.cp.data.api.CpDataException

sealed trait ValueFormat

case object IntValue extends ValueFormat
case object FloatValue extends ValueFormat
case object DoubleValue extends ValueFormat
case object Utf16CharValue extends ValueFormat
case object StringValue extends ValueFormat
case object Iso8601Date extends ValueFormat
case object EtcDate extends ValueFormat
case object Iso8601DateTime extends ValueFormat
case object Iso8601TimeOfDay extends ValueFormat
case object IsoLikeLocalDateTime extends ValueFormat

object ValueFormat{

	import CpMetaVocab._

	def fromUri(uri: java.net.URI): ValueFormat = uri match {
		case `int32` => IntValue
		case `float32` => FloatValue
		case `float64` => DoubleValue
		case `bmpChar` => Utf16CharValue
		case `string` => StringValue
		case `iso8601date` => Iso8601Date
		case `etcDate` => EtcDate
		case `iso8601dateTime` => Iso8601DateTime
		case `iso8601timeOfDay` => Iso8601TimeOfDay
		case `isoLikeLocalDateTime` => IsoLikeLocalDateTime
		case _ => throw new CpDataException(s"Unsupported value format $uri")
	}
}

