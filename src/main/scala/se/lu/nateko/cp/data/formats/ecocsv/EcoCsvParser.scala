package se.lu.nateko.cp.data.formats.ecocsv

import se.lu.nateko.cp.data.api.EcoCsvParsingException
import se.lu.nateko.cp.data.formats.*

class EcoCsvParser {

	case class Accumulator(
		columnNames: Array[String],
		offsetFromUtc: Int,
		lineNumber: Int,
		cells: Array[String],
		formats: Array[Option[ValueFormat]],
		error: Option[Throwable]
	) extends ParsingAccumulator {
		def incrementLine = copy(lineNumber = lineNumber + 1)
		def isOnData = lineNumber > 2
	}

	def seed = Accumulator(Array.empty, 1, 0, Array.empty, Array.empty, None)

	def parseLine(columnsMeta: ColumnsMeta)(acc: Accumulator, line: String): Accumulator = {
		if (acc.error.isDefined) acc

		else if (acc.lineNumber >= 2) {
			val cells = line.split(',')
			val expectedCells = acc.columnNames.length

			if (cells.length != expectedCells)
				acc.copy(error = Some(
					new EcoCsvParsingException(
						s"Encountered ${cells.length} cells on line ${acc.lineNumber + 1}, expected $expectedCells"
					)
				)).incrementLine
			else acc.copy(cells = cells, lineNumber = acc.lineNumber + 1)

		} else if (acc.lineNumber == 0) {
			val columnNames = line.split(',')
			val formats = columnNames.map(columnsMeta.matchColumn)
			acc.copy(columnNames = columnNames, formats = formats).incrementLine
		}

		else {
			//lineNumber = 1 and line is the units line
			val timeFormat = line.split(',')(1)

			if (!timeFormat.endsWith("(CET)"))
				acc.copy(error = Some(
					new EcoCsvParsingException(s"Unsupported time format $timeFormat, should end with '(CET)'")
				))
			else acc.copy(offsetFromUtc = 1).incrementLine
		}
	}
}

object EcoCsvParser {
	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case ValueFormat.FloatValue => value == "NaN"
		case _ => false
	}
}
