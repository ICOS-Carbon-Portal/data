package se.lu.nateko.cp.data.formats.dailysitescsv

import se.lu.nateko.cp.data.formats.{ColumnFormats, FloatValue, ProperTimeSeriesToBinTableConverter, ValueFormat}

class DailySitesCsvToBinTableConverter(
	colFormats: ColumnFormats
) extends ProperTimeSeriesToBinTableConverter(colFormats: ColumnFormats) {
	protected def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN"
		case _ => false
	}
}
