package se.lu.nateko.cp.data

package object formats {

	type ColumnValueFormats = Map[String, ValueFormat]

	case class ColumnFormats(valueFormats: ColumnValueFormats, timeStampColumn: String)

	implicit class EnrichedColumnFormats(val formats: ColumnFormats) extends AnyVal{
		def sortedColumns: Array[String] = formats.valueFormats.keys.toArray.sorted
	}

}