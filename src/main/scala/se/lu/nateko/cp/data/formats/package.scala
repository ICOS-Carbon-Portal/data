package se.lu.nateko.cp.data

package object formats {

	type ColumnValueFormats = Map[String, ValueFormat]

	case class ColumnFormats(valueFormats: ColumnValueFormats, timeStampColumn: String)

	implicit class EnrichedColumnFormats(val valueFormats: ColumnValueFormats) extends AnyVal{
		def sortedColumns: Array[String] = valueFormats.keys.toArray.sorted
	}

}