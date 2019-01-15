package se.lu.nateko.cp.data.formats.dailysitescsv

import se.lu.nateko.cp.data.formats.{ColumnsMeta, FloatValue, ProperTimeSeriesToBinTableConverter, ValueFormat}

class DailySitesCsvToBinTableConverter(
	formats: ColumnsMeta
) extends ProperTimeSeriesToBinTableConverter(formats: ColumnsMeta) {
	protected def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == ""
		case _ => false
	}
}
