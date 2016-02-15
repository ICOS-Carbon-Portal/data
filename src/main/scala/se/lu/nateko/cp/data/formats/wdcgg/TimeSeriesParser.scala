package se.lu.nateko.cp.data.formats.wdcgg

object TimeSeriesParser {

	case class Accumulator(
			headerLength: Int,
			totLength: Int,
			columnNames: Array[String],
			lineNumber: Int,
			cells: Array[String]
		){
		def isOnData = (headerLength > 0 && lineNumber >= headerLength)
		def incrementLine = copy(lineNumber = lineNumber + 1)
	}

	private val totLinesPattern = """^C\d+\s+TOTAL\s+LINES:\s+(\d+)""".r.unanchored
	private val headLinesPattern = """^C\d+\s+HEADER\s+LINES:\s+(\d+)""".r.unanchored
	private val wsPattern = "\\s+".r

	def seed = Accumulator(0, 0, Array.empty, 0, Array.empty)

	def parseLine(acc: Accumulator, line: String): Accumulator = {

		if(acc.isOnData)
			acc.copy(cells = wsPattern.split(line), lineNumber = acc.lineNumber + 1)

		else if(acc.headerLength == acc.lineNumber + 1)//the column names line
			acc.copy(columnNames = wsPattern.split(line).drop(1)).incrementLine

		else line match {
			case headLinesPattern(n) => acc.copy(headerLength = n.toInt).incrementLine
			case totLinesPattern(n) => acc.copy(totLength = n.toInt).incrementLine
			case _ => acc.incrementLine
		}
	}
}

