package se.lu.nateko.cp.data.formats.dailysitescsv

import se.lu.nateko.cp.data.formats.{ParsingAccumulator, ProperTableRowHeader}

object DailySitesCsvParser {
	val separator = ','

	case class Accumulator(
		header: ProperTableRowHeader,
		cells: Array[String],
		error: Option[Throwable])
		extends ParsingAccumulator {
		def isOnData = !header.columnNames.isEmpty
	}
}

class DailySitesCsvParser(nRows: Int) {
	import DailySitesCsvParser._

	def seed = Accumulator(ProperTableRowHeader(Array.empty, nRows), Array.empty, None)

	def parseLine(acc: Accumulator, line: String): Accumulator = {
		if (acc.error.isDefined) {
			acc
		} else if (acc.isOnData) { // Header
			acc.copy(cells = line.split(separator))
		} else { // Rows
			acc.copy(header = ProperTableRowHeader(line.split(separator), nRows))
		}
	}
}
