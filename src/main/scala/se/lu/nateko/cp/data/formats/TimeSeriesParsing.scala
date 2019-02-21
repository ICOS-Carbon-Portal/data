package se.lu.nateko.cp.data.formats

trait ParsingAccumulator {
	def error: Option[Throwable]
	def isOnData: Boolean
}

case class TableRowHeader(columnNames: Array[String], nRows: Int)
case class TableRow(header: TableRowHeader, cells: Array[String])
