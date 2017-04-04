package se.lu.nateko.cp.data.formats.ecocsv

import se.lu.nateko.cp.data.api.EcoCsvParsingException
import se.lu.nateko.cp.data.formats.ParsingAccumulator
import se.lu.nateko.cp.data.formats.TableRowHeader

object EcoCsvParser {

	case class Header(columnNames: Array[String], offsetFromUtc: Int) extends TableRowHeader

	case class Accumulator(
		header: Header,
		lineNumber: Int,
		cells: Array[String],
		error: Option[Throwable]
	) extends ParsingAccumulator{
		def incrementLine = copy(lineNumber = lineNumber + 1)
		def isOnData = lineNumber > 2
	}

	def seed = Accumulator(Header(Array.empty, 0), 0, Array.empty, None)

	def parseLine(acc: Accumulator, line: String): Accumulator = {
		if(acc.error.isDefined) acc

		else if(acc.lineNumber >= 2){
			val cells = line.split(',')
			val expectedCells = acc.header.columnNames.length

			if(cells.length != expectedCells)
				acc.copy(error = Some(
					new EcoCsvParsingException(
						s"Encountered ${cells.length} cells on line ${acc.lineNumber + 1}, expected $expectedCells"
					)
				)).incrementLine
			else acc.copy(cells = cells, lineNumber = acc.lineNumber + 1)

		} else if(acc.lineNumber == 0)
			acc.copy(header = acc.header.copy(columnNames = line.split(','))).incrementLine

		else{
			//lineNumber = 1 and line is the units line
			val timeFormat = line.split(',')(1)

			if(!timeFormat.endsWith("(CET)"))
				acc.copy(error = Some(
					new EcoCsvParsingException(s"Unsupported time format $timeFormat, should end with '(CET)'")
				))
			else acc.copy(header = acc.header.copy(offsetFromUtc = 1)).incrementLine
		}
	}

}
