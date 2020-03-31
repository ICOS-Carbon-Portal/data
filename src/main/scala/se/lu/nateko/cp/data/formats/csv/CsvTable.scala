package se.lu.nateko.cp.data.formats.csv

import scala.io.Source

trait TextTableRow extends IndexedSeq[String] {

	def apply(colName: String): String

}

trait TextTable {

	def columnNames: Seq[String]
	def rows: Seq[TextTableRow]

}

trait ArrayTextTable extends TextTable{
	protected def arrays: Seq[Array[String]]

	override def rows: Seq[TextTableRow] = {
		val colNames = columnNames
		val nOfCols = colNames.length
		val colIndexLookup = colNames.zipWithIndex.toMap
		arrays.map{array =>
			assert(array.length == nOfCols, "TextTable must have the same number of columns in every row!")
			new ArrayTableRow(array, colIndexLookup)
		}
	}

	private class ArrayTableRow(row: Array[String], colIndexLookup: Map[String, Int]) extends TextTableRow{
		override def length = row.length
		def apply(i: Int) = row(i)
		def apply(colName: String) = row(colIndexLookup(colName))
	}
}

class TsvDataTable(source: Source) extends ArrayTextTable {

	private val parser = CsvParser.tsv

	private val reader = source.getLines().scanLeft(CsvParser.seed)(parser.parseLine).collect{
		case acc if acc.lastState == CsvParser.Init => acc.cells
	}

	override val columnNames: Seq[String] = reader.next().toSeq

	final override protected def arrays: LazyList[Array[String]] = {
		if(!reader.hasNext) {
			source.close()
			LazyList.empty
		}
		else {
			val row = reader.next()
			LazyList.cons(row, arrays)
		}
	}
}

class TrimmedTextTableRow(inner: TextTableRow) extends TextTableRow{
	override def length = inner.length
	override def apply(i: Int) = inner(i).trim
	override def apply(colName: String) = inner(colName).trim
}

class TrimmingTextTable(inner: TextTable) extends TextTable {
	override def columnNames: Seq[String] = inner.columnNames
	override def rows: Seq[TextTableRow] = inner.rows.map(new TrimmedTextTableRow(_))
}
