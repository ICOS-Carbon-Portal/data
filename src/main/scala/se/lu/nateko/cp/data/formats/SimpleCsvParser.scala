package se.lu.nateko.cp.data.formats

import se.lu.nateko.cp.data.api.CpDataParsingException

class SimpleCsvParser(columnsMeta: ColumnsMeta, separator: String) extends TextFormatParser[SimpleCsvParser.Accumulator] {

	import SimpleCsvParser._

	def parseLine(acc: Accumulator, line: String): Accumulator =
		if(acc.error.isDefined)
			acc
		else if(acc.header.colNames.isEmpty) {
			val columnNames = line.split(separator)
			val formats = columnNames.map(columnsMeta.matchColumn)
			acc.copy(header = new Header(columnNames, formats, None))
		} else {
			val newCells = line.split(separator, -1)
			val expectedNcells = acc.header.colNames.length

			if(newCells.length == expectedNcells)
				acc.copy(cells = newCells)
			else {
				val err = new CpDataParsingException(
					s"Expected ${expectedNcells} values but the following row had ${newCells.length} values:\n$line"
				)
				val newHeader = new Header(acc.header.colNames, acc.header.formats, Some(err))
				acc.copy(header = newHeader)
			}
		}

}

object SimpleCsvParser{

	case class Accumulator(header: Header, cells: Array[String]) extends StandardParsingAcculumator {
		override def isOnData = !cells.isEmpty
		override def error = header.error
	}

	def seed = Accumulator(new Header(Array.empty, Array.empty, None), Array.empty)
}
