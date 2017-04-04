package se.lu.nateko.cp.data

package object formats {

	type ColumnFormats = Map[String, ValueFormat]

	implicit class EnrichedColumnFormats(val formats: ColumnFormats) extends AnyVal{
		def sortedColumns = formats.keys.toArray.sorted
	}

}