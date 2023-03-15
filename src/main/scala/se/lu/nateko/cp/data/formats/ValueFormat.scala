package se.lu.nateko.cp.data.formats

import se.lu.nateko.cp.data.api.CpMetaVocab
import se.lu.nateko.cp.data.api.CpDataException

enum ValueFormat:
	case IntValue, FloatValue, DoubleValue
	case Utf16CharValue, StringValue
	case Iso8601Date, EtcDate
	case Iso8601TimeOfDay
	case Iso8601Month
	case Iso8601DateTime, IsoLikeLocalDateTime, EtcLocalDateTime

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
		case `iso8601month` => Iso8601Month
		case `iso8601dateTime` => Iso8601DateTime
		case `iso8601timeOfDay` => Iso8601TimeOfDay
		case `isoLikeLocalDateTime` => IsoLikeLocalDateTime
		case `etcLocalDateTime` => EtcLocalDateTime
		case _ => throw new CpDataException(s"Unsupported value format $uri")
	}
}

