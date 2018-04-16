package se.lu.nateko.cp.data.formats.atcprod

import se.lu.nateko.cp.data.formats.ParsingAccumulator

object AtcProdParser {

	case class Header(
		headerLength: Int,
		totLength: Int,
		columnNames: Array[String]
	){
		def nRows = totLength - headerLength
	}

	case class Accumulator(
			header: Header,
			lineNumber: Int,
			cells: Array[String],
			error: Option[Throwable]
		) extends ParsingAccumulator{

		def incrementLine = copy(lineNumber = lineNumber + 1)
		def isOnData = (header.headerLength > 0 && lineNumber > header.headerLength)
		def changeHeader(
				headerLength: Int = header.headerLength,
				totLength: Int = header.totLength,
				columnNames: Array[String] = header.columnNames
			): Accumulator =
			copy(header = header.copy(headerLength, totLength, columnNames))
	}

	private val totLinesPattern = """# TOTAL LINES: (\d+)""".r
	private val headLinesPattern = """# HEADER LINES: (\d+)""".r
	private val sep = ';'

	def seed = Accumulator(Header(0, 0, Array.empty), 0, Array.empty, None)

	def parseLine(acc: Accumulator, line: String): Accumulator = {
		if(acc.error.isDefined) acc

		else if(acc.header.headerLength > 0 && acc.lineNumber >= acc.header.headerLength)
			acc.copy(cells = line.split(sep), lineNumber = acc.lineNumber + 1)

		else if(acc.lineNumber == acc.header.headerLength - 1) {
			val colNames = line.drop(1).split(sep)
			acc.changeHeader(columnNames = colNames).incrementLine
		}

		else (line match {
			case headLinesPattern(n) =>
				acc.changeHeader(headerLength = n.toInt)

			case totLinesPattern(n) =>
				acc.changeHeader(totLength = n.toInt)

			case _ => acc

		}).incrementLine
	}

}
