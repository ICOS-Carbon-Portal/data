package se.lu.nateko.cp.data.formats

trait ParsingAccumulator {
	def error: Option[Throwable]
	def isOnData: Boolean
}

trait TableRowHeader{
	def columnNames: Array[String]
}

case class ProperTableRowHeader(columnNames: Array[String], nRows: Int) extends TableRowHeader

trait TableRow[H <: TableRowHeader]{
	def header: H
	def cells: Array[String]
}

case class ProperTableRow(header: ProperTableRowHeader, cells: Array[String]) extends TableRow[ProperTableRowHeader]
