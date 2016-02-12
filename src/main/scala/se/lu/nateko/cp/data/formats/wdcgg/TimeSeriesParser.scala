package se.lu.nateko.cp.data.formats.wdcgg

import java.util.Locale

import se.lu.nateko.cp.data.formats.{ValueFormatParser, ValueFormat}
import se.lu.nateko.cp.data.formats.csv.CsvParser

object TimeSeriesParser {

	class Accumulator(val headerLength: Int, val totLength: Int, val columnPositions: Map[String, Int], val lineNumber: Int, val cells: Array[Object]){
		def isOnData = (headerLength > 0 && lineNumber > headerLength)
	}

	def seed = new Accumulator(0, 0, Map.empty, 1, Array.empty)
}

class TimeSeriesParser(locale: Locale, val schema: (String, ValueFormat)*) {

	import TimeSeriesParser._

	private val csvParser = CsvParser.default
	val valueFormatParser = new ValueFormatParser(locale)

	private val totLinesPattern = """^C\d+\s+TOTAL\s+LINES:\s+(\d+)""".r.unanchored
	private val headLinesPattern = """^C\d+\s+HEADER\s+LINES:\s+(\d+)""".r.unanchored

	def parseLine(acc: Accumulator, line: String): Accumulator = {

		if(acc.headerLength == 0 || (acc.headerLength > 0 && acc.lineNumber < acc.headerLength)){
			//In the header but not the last header line that contains the column names
			line match {
				case totLinesPattern(n) =>
					new Accumulator(acc.headerLength, n.toInt, acc.columnPositions, acc.lineNumber + 1, Array.empty)

				case headLinesPattern(n) =>
					new Accumulator(n.toInt, acc.totLength, acc.columnPositions, acc.lineNumber + 1, Array.empty)

				case _ => new Accumulator(acc.headerLength, acc.totLength, acc.columnPositions, acc.lineNumber + 1, Array.empty)
			}

		} else if(acc.isOnData){
			//In the data section
			val cells = parseOneLine(line)

			val parsedCells: Array[Object] = schema.map{
					case (colName, valFormat) =>
						val colPos = acc.columnPositions(colName)
						val cellValue = cells(colPos)
						valueFormatParser.parse(cellValue, valFormat)
				}.toArray

			new Accumulator(acc.headerLength, acc.totLength, acc.columnPositions, acc.lineNumber + 1, parsedCells)

		} else {
			//One single line: the column names
			val columnNames = parseOneLine(line).toSeq.drop(1)

			val colPositions = columnNames.zipWithIndex.groupBy(_._1).mapValues(_.map(_._2).min).toSeq.toMap

			new Accumulator(acc.headerLength, acc.totLength, colPositions, acc.lineNumber + 1, Array.empty)
		}
	}

	private def parseOneLine(line: String): Array[String] = {
		val csvLine = line.trim.replaceAll("\\s+", ",")
		csvParser.parseLine(CsvParser.seed, csvLine).cells
	}
}
