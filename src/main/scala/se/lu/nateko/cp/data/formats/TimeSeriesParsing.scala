package se.lu.nateko.cp.data.formats

trait ParsingAccumulator {
	def error: Option[Throwable]
	def isOnData: Boolean
}

case class ProperTableRowHeader(columnNames: Array[String], nRows: Int)
case class ProperTableRow(header: ProperTableRowHeader, cells: Array[String])
