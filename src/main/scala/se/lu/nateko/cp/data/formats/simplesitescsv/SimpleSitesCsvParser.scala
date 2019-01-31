package se.lu.nateko.cp.data.formats.simplesitescsv

import se.lu.nateko.cp.data.formats.simplesitescsv.SimpleSitesCsvParser.Accumulator
import se.lu.nateko.cp.data.formats._

object SimpleSitesCsvParser {

	val separator = ","

	case class Accumulator(
		header: ProperTableRowHeader,
		lineNumber: Int,
		cells: Array[String],
		formats: Array[Option[ValueFormat]],
		error: Option[Throwable])
	extends ParsingAccumulator {
		def incrementLine = copy(lineNumber = lineNumber + 1)
		def isOnData = lineNumber > 1
	}

	def parseLine(columnsMeta: ColumnsMeta)(acc: Accumulator, line: String): Accumulator = {
		if (acc.error.isDefined) {
			acc
		} else if (acc.lineNumber == 0) { // Header
			val columnNames = line.split(separator)
			val formats = columnNames.map(columnsMeta.matchColumn)
			acc.copy(header = acc.header.copy(columnNames = columnNames), formats = formats).incrementLine
		} else { // Rows
			acc.copy(cells = line.split(separator, -1)).incrementLine
		}
	}

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == ""
		case _ => false
	}
}

class SimpleSitesCsvParser(nRows: Int) {
	def seed: Accumulator = Accumulator(ProperTableRowHeader(Array.empty, nRows), 0, Array.empty, Array.empty, None)
}
