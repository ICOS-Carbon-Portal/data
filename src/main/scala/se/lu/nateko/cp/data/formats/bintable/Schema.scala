package se.lu.nateko.cp.data.formats.bintable;

case class Schema(val columns: Array[DataType], val size: Long):

	def hasStringColumn: Boolean = columns.exists(_ == DataType.STRING)
