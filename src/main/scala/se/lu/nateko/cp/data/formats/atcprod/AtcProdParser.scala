package se.lu.nateko.cp.data.formats.atcprod

import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.*

object AtcProdParser {
	import ValueFormat.*

	case class Header(
		headerLength: Int,
		totLength: Int,
		columnNames: Array[String]
	) {
		def nRows = totLength - headerLength
	}

	case class Accumulator(
		header: Header,
		lineNumber: Int,
		cells: Array[String],
		formats: Array[Option[ValueFormat]],
		error: Option[Throwable],
	) extends ParsingAccumulator {

		def incrementLine = copy(lineNumber = lineNumber + 1)

		def headerConsumed = (header.headerLength > 0 && lineNumber >= header.headerLength)
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
	private val sep = ";"

	def seed = Accumulator(Header(0, 0, Array.empty), 0, Array.empty, Array.empty, None)

	def parseLine(columnsMeta: ColumnsMeta)(acc: Accumulator, line: String): Accumulator = {
		if (acc.error.isDefined) acc

		else if(acc.headerConsumed == line.startsWith("#"))
			val quantifier = if acc.lineNumber < acc.header.headerLength then "few" else "many"
			acc.incrementLine.copy(error = Some(new CpDataParsingException(s"Got too $quantifier header lines (expected ${acc.header.headerLength})")))

		else if (acc.header.headerLength > 0 && acc.lineNumber >= acc.header.headerLength){
			val cells0 = line.split(sep, -1)
			val missingCellsN = acc.header.columnNames.size - cells0.size
			val cells: Array[String] = if(missingCellsN > 0)
					cells0 :++ Iterable.fill(missingCellsN)("") //append trailing empty strings for missing cells
				else cells0
			acc.copy(cells = cells).incrementLine
		}

		else if (acc.lineNumber == acc.header.headerLength - 1) {
			val ambiguousColNames = line.drop(1).split(sep)
			val isMultiVar = hasMultipleMainVariables(columnsMeta)
			val colNames = disambiguateColumnNames(ambiguousColNames, isMultiVar)
			val formats = colNames.map(columnsMeta.matchColumn)
			acc.changeHeader(columnNames = colNames).copy(formats = formats).incrementLine
		}

		else (line match {
			case headLinesPattern(n) =>
				acc.changeHeader(headerLength = n.toInt)

			case totLinesPattern(n) =>
				acc.changeHeader(totLength = n.toInt)

			case _ => acc

		}).incrementLine
	}

	private val reoccuringColNames = Set("Stdev", "NbPoints", "Flag", "QualityId")

	private def hasMultipleMainVariables(columnsMeta: ColumnsMeta): Boolean = reoccuringColNames.exists{reoccName =>
		columnsMeta.columns.count{
			case p: PlainColumn => p.title.startsWith(reoccName)
			case anyCol => anyCol.matches(reoccName)
		} > 1
	}

	def disambiguateColumnNames(names: Array[String], evenIfOnlyOneMainVar: Boolean): Array[String] = {

		val ambigs =
			if(evenIfOnlyOneMainVar) reoccuringColNames
			else reoccuringColNames.filter { amb =>
				names.count(_ == amb) > 1
			}

		if (ambigs.isEmpty) names else names.scanLeft(("", "")) {
			case ((varName, _), nextColName) =>
				if (ambigs.contains(nextColName))
					(varName, s"$varName-$nextColName")
				else
					(nextColName, nextColName)
		}.drop(1).map(_._2)
	}

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		//empty values are always treated as missing
		case FloatValue => value == "-999.990" || value == "-999.99" || value == "-9.99"
		case IntValue => value == null
		case Utf16CharValue => value == null
		case vf => throw new Exception(s"Did not expect value format $vf in ATC product time series data")
	}
}
