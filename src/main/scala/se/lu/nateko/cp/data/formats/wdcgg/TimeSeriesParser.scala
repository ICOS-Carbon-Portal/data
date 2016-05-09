package se.lu.nateko.cp.data.formats.wdcgg

import se.lu.nateko.cp.data.api.WdcggParsingException
import scala.collection.immutable.ListMap
import org.slf4j.LoggerFactory

object TimeSeriesParser {

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
			error: Option[Throwable]
		){

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

	def seed = Accumulator(Header(0, 0, Array.empty, "", 0, ListMap.empty), 0, Array.empty, None)

	def parseLine(acc: Accumulator, line: String): Accumulator = {
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
					acc.changeHeader(columnNames = colNames).incrementLine
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
			val country = value.split(' ').map(part => part.head + part.tail.toLowerCase).mkString(" ")
			(harmonizedKey, countryRenamings.getOrElse(country, country))
		case SamplingTypeKey =>
			(harmonizedKey, if(value == "Remote sensing") "remote sensing" else value)
		case MeasUnitKey =>
			val harmValue = if(value.endsWith("in dry air)")) "ppm"
				else if (value == "Bq/m³") "Bq/m3" else value
			(harmonizedKey, harmValue)
		case _ =>
			(harmonizedKey, value)
	}


}

