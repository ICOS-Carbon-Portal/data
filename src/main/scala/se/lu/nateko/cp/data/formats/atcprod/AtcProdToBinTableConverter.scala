package se.lu.nateko.cp.data.formats.atcprod

import se.lu.nateko.cp.data.formats._
import java.time.Instant

class AtcProdToBinTableConverter(colFormats: ColumnFormats, header: AtcProdParser.Header)
	extends TimeSeriesToBinTableConverter(colFormats, header.columnNames, header.nRows){

	private val timeIndices = Seq("Year", "Month", "Day", "Hour", "Minute", "Second").map(header.columnNames.indexOf)

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "-999.990"
		case IntValue => value == null || value.trim.isEmpty
		case Utf16CharValue => value == null || value.isEmpty
		case vf => throw new Exception(s"Did not expect value format $vf in ATC product time series data")
	}

	def amend(value: String, format: ValueFormat): String = value

	def getTimeStamp(cells: Array[String], parsed: Array[AnyRef]): AnyRef = {
		val Seq(year, month, day, hour, min, sec) = timeIndices.map{idx =>
			if(idx >= 0) cells(idx) else "00"
		}
		Double.box(Instant.parse(s"$year-$month-${day}T$hour:$min:${sec}Z").toEpochMilli.toDouble)
	}

}
