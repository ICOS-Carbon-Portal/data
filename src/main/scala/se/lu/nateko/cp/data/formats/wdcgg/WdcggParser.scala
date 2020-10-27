package se.lu.nateko.cp.data.formats.wdcgg

import org.slf4j.LoggerFactory
import se.lu.nateko.cp.data.api.WdcggParsingException
import se.lu.nateko.cp.data.formats._

import scala.collection.immutable.ListMap

object WdcggParser {

	case class Header(
		headerLength: Int,
		totLength: Int,
		columnNames: Array[String],
		parameter: String,
		offsetFromUtc: Int,
		kvPairs: ListMap[String, String]
	){
		def nRows = totLength - headerLength
	}

	case class Accumulator(
		header: Header,
		lineNumber: Int,
		cells: Array[String],
		formats: Array[Option[ValueFormat]],
		error: Option[Throwable]
	) extends ParsingAccumulator{

		def incrementLine = copy(lineNumber = lineNumber + 1)
		def isOnData = (header.headerLength > 0 && lineNumber > header.headerLength)
		def changeHeader(
				headerLength: Int = header.headerLength,
				totLength: Int = header.totLength,
				columnNames: Array[String] = header.columnNames,
				parameter: String = header.parameter,
				offsetFromUtc: Int = header.offsetFromUtc,
				kvPairs: ListMap[String, String] = header.kvPairs
			): Accumulator =
			copy(header = header.copy(headerLength, totLength, columnNames, parameter, offsetFromUtc, kvPairs))
	}

	val ParamKey = "PARAMETER"
	val CountryKey = "COUNTRY/TERRITORY"
	val SamplingTypeKey = "SAMPLING TYPE"
	val MeasUnitKey = "MEASUREMENT UNIT"
	private val headerPattern = """C\d\d(.*)""".r
	private val headerKvPattern = """C\d\d ([^:]+): ?(.*)""".r
	private val totLinesPattern = """C\d\d TOTAL LINES: (\d+)""".r
	private val headLinesPattern = """C\d\d HEADER LINES: (\d+)""".r
	private val wsPattern = "\\s+".r
	private val TimeZoneKey = "TIME ZONE"

	private val logger = LoggerFactory.getLogger(getClass)

	def seed = Accumulator(Header(0, 0, Array.empty, "", 0, ListMap.empty), 0, Array.empty, Array.empty, None)

	def parseLine(columnsMeta: ColumnsMeta)(acc: Accumulator, line: String): Accumulator = {
		if(acc.error.isDefined) acc

		else if(acc.header.headerLength > 0 && acc.lineNumber >= acc.header.headerLength)
			acc.copy(cells = wsPattern.split(line), lineNumber = acc.lineNumber + 1)

		else if(acc.lineNumber == acc.header.headerLength - 1) {
			val paramName = acc.header.parameter
			val colNamesAttempt = wsPattern.split(line)

			if(colNamesAttempt.length > 1 && colNamesAttempt(1) == "DATE"){
				if(colNamesAttempt.contains(paramName)) {
					//the correct column names line is present
					val colNames = mapColNames(colNamesAttempt.drop(1), paramName)
					val formats = colNames.map(columnsMeta.matchColumn)
					acc.changeHeader(columnNames = colNames).copy(formats = formats).incrementLine
				} else acc.copy(error = Some(new WdcggParsingException(
					s"Unsupported WDCGG file format; column names row was: $line"
				)))
			}else{
				val fileName = acc.header.kvPairs.getOrElse("FILE NAME", "(unknown file!)")
				logger.warn(s"File $fileName is missing the column names row; amending it with standard column names")

				acc.changeHeader(
					headerLength = acc.header.headerLength - 1,
					columnNames = Array("DATE", "TIME", "DATE", "TIME", ParamKey, "ND", "SD", "F", "CS", "REM")
				).copy(cells = colNamesAttempt).incrementLine
			}
		}

		else (line match {
			case headLinesPattern(n) =>
				acc.changeHeader(headerLength = n.toInt)

			case totLinesPattern(n) =>
				acc.changeHeader(totLength = n.toInt)

			case headerKvPattern(key, value) =>
				val withSpecialKvs =
					if(key == TimeZoneKey)
						acc.changeHeader(offsetFromUtc = parseUtcOffset(value))
					else if(key == ParamKey)
						acc.changeHeader(parameter = value)
					else acc

				val harmonizedKey = keyRenamings.getOrElse(key, key)
				val updatedKvs = acc.header.kvPairs + makeKv(harmonizedKey, value)
				withSpecialKvs.changeHeader(kvPairs = updatedKvs)

			case headerPattern(value) =>
				val (lastKey, currentValue) = acc.header.kvPairs.last
				val newKvs = acc.header.kvPairs + ((lastKey, currentValue + value))
				acc.changeHeader(kvPairs = newKvs)
		}).incrementLine
	}

	private def parseUtcOffset(offset: String): Int = {
		val stripped = offset.stripPrefix("Other").stripPrefix("Local time").trim.stripPrefix("UTC").trim
		//TODO Check if absent time zone info does imply UTC
		if(stripped.isEmpty) 0 else stripped.toInt
	}

	private def mapColNames(origColNames: Array[String], paramColName: String) = {
		origColNames.map(col => if(col == paramColName) ParamKey else col)
	}

	private val keyRenamings = Map("COUNTRY/TERITORY" -> CountryKey)
	private val countryRenamings = Map(
		"Hong Kong" -> "Hong Kong, China",
		"Korea, Republic Of" -> "Republic of Korea",
		"N/a" -> "N/A",
		"Netherlands (the)" -> "Netherlands",
		"United Kingdom" -> "United Kingdom of Great Britain and Northern Ireland",
		"United States" -> "United States of America"
	)

	private def makeKv(harmonizedKey: String, value: String): (String, String) = harmonizedKey match {
		case CountryKey =>
			val country = value.split(' ').map(_.toLowerCase.capitalize).mkString(" ")
			(harmonizedKey, countryRenamings.getOrElse(country, country).trim)
		case SamplingTypeKey =>
			(harmonizedKey, if(value == "Remote sensing") "remote sensing" else value)
		case MeasUnitKey =>
			val harmValue = if(value.endsWith("in dry air)")) "ppm"
				else if (value == "Bq/m³") "Bq/m3" else value
			(harmonizedKey, harmValue)
		case _ =>
			(harmonizedKey, value)
	}

	private val floatNullRegex = "\\-9+\\.9*".r
	private val timeRegex = "(\\d\\d):(\\d\\d)".r
	private val nullDates = Set("99-99", "02-30", "04-31", "06-31", "09-31", "11-31")

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case IntValue => value == "-9999"
		case FloatValue | DoubleValue => floatNullRegex.findFirstIn(value).isDefined
		case Utf16CharValue => value.isEmpty
		case StringValue => value == null
		case Iso8601Date => nullDates.contains(value.substring(5))
		case Iso8601DateTime | EtcDate => throw new Exception("Did not expect these value types (Iso8601DateTime | EtcDate) in WDCGG data")
		case Iso8601TimeOfDay => value == "99:99" || value.startsWith("25:") || value.startsWith("26:")
		case IsoLikeLocalDateTime => throw new Exception("Did not expect this value type (IsoLikeLocalDateTime) in WDCGG data")
		case EtcLocalDateTime => throw new Exception("Did not expect this value type (EtcLocalDateTime) in WDCGG data")
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
