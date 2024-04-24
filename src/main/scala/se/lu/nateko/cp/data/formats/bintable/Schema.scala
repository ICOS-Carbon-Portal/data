package se.lu.nateko.cp.data.formats.bintable

/*
 * LONG has been omitted intentionally as it cannot be represented exactly in Javascript
 */
enum DataType(val byteSize: Int):
	case INT extends DataType(4)
	case FLOAT extends DataType(4)
	case DOUBLE extends DataType(8)
	case SHORT extends DataType(2)
	case CHAR extends DataType(2)
	case BYTE extends DataType(1)
	case STRING extends DataType(4)

class Schema(val columns: Array[DataType], val size: Long):
	def hasStringColumn: Boolean = columns.exists(_ == DataType.STRING)
