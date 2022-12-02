package se.lu.nateko.cp.data.formats.delimitedheadercsv

import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.*

class DelimitedHeaderCsvParser(
	columnsMeta: ColumnsMeta,
	columnSeparator: String,
	headerDelimitor: String
) extends TextFormatParser {

	import DelimitedHeaderCsvParser._

	type A = Accumulator

	def parseLine(acc: Accumulator, line: String): Accumulator = {
		if (acc.error.isDefined) {
			acc
		} else if (line == headerDelimitor) {
			acc.copy(hasReachedHeaderDelimitor = true)
		} else if (!acc.hasReachedHeaderDelimitor && acc.header.colNames.isEmpty) {
			acc
		} else if (acc.hasReachedHeaderDelimitor && acc.header.colNames.isEmpty) {
			val columnNames = line.split(columnSeparator)
			val formats = columnNames.map(columnsMeta.matchColumn)
			acc.copy(header = new StandardHeader(columnNames, formats, None))
		} else {
			val newCells = line.split(columnSeparator, -1)
			val expectedNcells = acc.header.colNames.length

			if (newCells.length == expectedNcells) {
				acc.copy(cells = newCells)
			} else {
				val err = new CpDataParsingException(
					s"Expected ${expectedNcells} values but the following row had ${newCells.length} values:\n$line"
				)
				val newHeader = new StandardHeader(acc.header.colNames, acc.header.formats, Some(err))
				acc.copy(header = newHeader)
			}
		}
	}

	def seed: Accumulator = Accumulator(new StandardHeader(Array.empty, Array.empty, None), Array.empty, false)
}

object DelimitedHeaderCsvParser {

	case class Accumulator(
		header: StandardHeader,
		cells: Array[String],
		hasReachedHeaderDelimitor: Boolean
	) extends StandardParsingAcculumator {

		override def isOnData = !cells.isEmpty
		override def error = header.error
	}

}
