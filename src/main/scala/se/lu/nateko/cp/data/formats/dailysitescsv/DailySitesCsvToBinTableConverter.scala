package se.lu.nateko.cp.data.formats.dailysitescsv

import se.lu.nateko.cp.data.formats.{ColumnValueFormats, FloatValue, ProperTimeSeriesToBinTableConverter, ValueFormat}

class DailySitesCsvToBinTableConverter(
	formats: ColumnValueFormats
) extends ProperTimeSeriesToBinTableConverter(formats: ColumnValueFormats) {
	protected def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == ""
		case _ => false
	}
}
