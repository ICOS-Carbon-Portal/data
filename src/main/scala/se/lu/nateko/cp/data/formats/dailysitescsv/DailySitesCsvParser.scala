package se.lu.nateko.cp.data.formats.dailysitescsv

import se.lu.nateko.cp.data.formats.{ParsingAccumulator, ProperTableRowHeader}

object DailySitesCsvParser {
	val separator = ','

	case class Accumulator(
		header: ProperTableRowHeader,
		cells: Array[String],
		error: Option[Throwable])
		extends ParsingAccumulator {
		def isOnData = !cells.isEmpty
	}
}

class DailySitesCsvParser(nRows: Int) {
	import DailySitesCsvParser._

	def seed = Accumulator(ProperTableRowHeader(Array.empty, nRows), Array.empty, None)

	def parseLine(acc: Accumulator, line: String): Accumulator = {
		if (acc.error.isDefined) {
			acc
		} else if (acc.header.columnNames.isEmpty) { // Header
			acc.copy(header = ProperTableRowHeader(line.split(separator), nRows))
		} else { // Rows
			acc.copy(cells = line.split(separator))
		}
	}
}
