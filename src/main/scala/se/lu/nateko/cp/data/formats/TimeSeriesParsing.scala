package se.lu.nateko.cp.data.formats

trait ParsingAccumulator {

	def error: Option[Throwable]

	def isOnData: Boolean

}


trait TableRowHeader{

	def columnNames: Array[String]

}


trait TableRow[H <: TableRowHeader]{

	def header: H

	def cells: Array[String]

}
