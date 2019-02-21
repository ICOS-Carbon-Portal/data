package se.lu.nateko.cp.data.formats.dailysitescsv

import se.lu.nateko.cp.data.api.DailyCsvParsingException
import se.lu.nateko.cp.data.formats.{ParsingAccumulator, TableRowHeader}

object DailySitesCsvParser {
	val separator = ","

	case class Accumulator(
		header: TableRowHeader,
		cells: Array[String],
		error: Option[Throwable])
		extends ParsingAccumulator {
		def isOnData = !cells.isEmpty
	}
}

class DailySitesCsvParser(nRows: Int) {
	import DailySitesCsvParser._

	def seed = Accumulator(TableRowHeader(Array.empty, nRows), Array.empty, None)

	def parseLine(acc: Accumulator, line: String): Accumulator = {
		if (acc.error.isDefined) {
			acc
		} else if (acc.header.columnNames.isEmpty) { // Header
			acc.copy(header = TableRowHeader(line.split(separator), nRows))
		} else { // Rows
			val cells = line.split(separator, -1)
			if (cells.length != acc.header.columnNames.length) {
				acc.copy(error = Some(
					new DailyCsvParsingException(
						s"Encountered $cells.length cells on line $line, expected $acc.header.columnNames.length"
					)
				))
			} else {
				acc.copy(cells = cells)
			}
		}
	}
}
