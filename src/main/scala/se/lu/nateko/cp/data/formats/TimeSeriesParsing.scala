package se.lu.nateko.cp.data.formats

trait TextFormatParser[A <: StandardParsingAcculumator] {
	def parseLine(acc: A, line: String): A
}

trait StandardParsingAcculumator extends ParsingAccumulator {
	def header: Header
	def cells: Array[String]
}

class Header(val colNames: Array[String], val formats: Array[Option[ValueFormat]], val error: Option[Throwable])

trait ParsingAccumulator {
	def error: Option[Throwable]
	def isOnData: Boolean
}

case class TableRowHeader(columnNames: Array[String], nRows: Int)
case class TableRow(header: TableRowHeader, cells: Array[String])

object TableRow{
	def empty(nRows: Int) = TableRow(TableRowHeader(Array.empty, nRows), Array.empty)
}
