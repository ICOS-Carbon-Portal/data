package se.lu.nateko.cp.data.formats.ecocsv

import se.lu.nateko.cp.data.formats._
import EcoCsvParser.Header

class EcoCsvToBinTableConverter(colFormats: ColumnFormats, header: Header, nRows: Int) extends{

	val timeCol = "time"
	val dateCol = "date"

} with TimeSeriesToBinTableConverter(colFormats, header.columnNames, header.offsetFromUtc, nRows){

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN"
		case _ => false
	}

	def amend(value: String, format: ValueFormat): String = value
}
