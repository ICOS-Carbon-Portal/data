package se.lu.nateko.cp.data.formats.socat

import se.lu.nateko.cp.data.formats._
import java.time.format.DateTimeFormatter
import java.time.LocalDateTime
import java.time.ZoneOffset

class SocatTsvToBinTableConverter(colFormats: ColumnsMetaWithTsCol, columnNames: Array[String], nRows: Int)
	extends TimeSeriesToBinTableConverter(colFormats, columnNames, nRows) {

	def amend(value: String, format: ValueFormat): String = value
	def isNull(value: String, format: ValueFormat): Boolean = value.isEmpty

	def getTimeStamp(cells: Array[String], parsed: Array[AnyRef]): AnyRef = {
		SocatTsvToBinTableConverter.parseTimestamp(cells(0))
	}
}

object SocatTsvToBinTableConverter{
	val timestampFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME

	def parseTimestamp(ts: String): AnyRef = {
		Double.box(LocalDateTime.parse(ts, timestampFormatter).toInstant(ZoneOffset.UTC).toEpochMilli.toDouble)
	}
}