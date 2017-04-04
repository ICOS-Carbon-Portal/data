package se.lu.nateko.cp.data.formats.wdcgg

import se.lu.nateko.cp.data.formats._

class WdcggToBinTableConverter(colFormats: ColumnFormats, header: WdcggParser.Header) extends{

	val timeCol = "TIME"
	val dateCol = "DATE"

} with DateColTimeColTimeSeriesToBinTableConverter(colFormats, header.columnNames, header.offsetFromUtc, header.nRows){

	private val floatNullRegex = "\\-9+\\.9*".r
	private val timeRegex = "(\\d\\d):(\\d\\d)".r
	private val nullDates = Set("99-99", "02-30", "04-31", "06-31", "09-31", "11-31")

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case IntValue => value == "-9999"
		case FloatValue | DoubleValue => floatNullRegex.findFirstIn(value).isDefined
		case StringValue => value == null
		case Iso8601Date => nullDates.contains(value.substring(5))
		case Iso8601DateTime | EtcDate => false //do not occur in WDCGG
		case Iso8601TimeOfDay => value == "99:99" || value.startsWith("25:") || value.startsWith("26:")
	}

	def amend(value: String, format: ValueFormat): String = format match {
		case Iso8601TimeOfDay => value match{
			case timeRegex(hourStr, minStr) =>
				minStr.toInt match{
					case 60 =>
						val hours = "%02d".format(hourStr.toInt + 1)
						s"$hours:00"
					case mins if mins > 60 => s"$hourStr:00"
					case _ => value
				}
			case _ => value
		}
		case _ => value
	}
}
