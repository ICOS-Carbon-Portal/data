package se.lu.nateko.cp.data.formats.simplesitescsv

import se.lu.nateko.cp.data.formats.{ParsingAccumulator, TableRowHeader}

object SimpleSitesCsvParser {

	val separator = ","

	case class Header(columnNames: Array[String]) extends TableRowHeader

	case class Accumulator(
			 header: Header,
			 lineNumber: Int,
			 cells: Array[String],
			 error: Option[Throwable])
	extends ParsingAccumulator {
		def incrementLine = copy(lineNumber = lineNumber + 1)
		def isOnData = lineNumber > 1
	}

	def seed = Accumulator(Header(Array.empty), 0, Array.empty, None)

	def parseLine(acc: Accumulator, line: String): Accumulator = {
		if (acc.error.isDefined) {
			acc
		} else if (acc.lineNumber == 0) { // Header
			acc.copy(header = acc.header.copy(columnNames = line.split(separator))).incrementLine
		} else { // Rows
			acc.copy(cells = line.split(separator, -1)).incrementLine
		}
	}
}
