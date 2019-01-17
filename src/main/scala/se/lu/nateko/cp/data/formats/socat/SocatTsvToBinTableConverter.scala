package se.lu.nateko.cp.data.formats.socat

import se.lu.nateko.cp.data.formats._
import java.time.format.DateTimeFormatter
import java.time.{Instant, LocalDateTime, ZoneOffset}

class SocatTsvToBinTableConverter(colFormats: ColumnsMeta)
	extends ProperTimeSeriesToBinTableConverter(colFormats) {

	def amend(value: String, format: ValueFormat): String = value
	def isNull(value: String, format: ValueFormat): Boolean = value.isEmpty

}

object SocatTsvToBinTableConverter{
	val timestampFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME

	def parseTimestamp(ts: String): Instant = {
		LocalDateTime.parse(ts, timestampFormatter).toInstant(ZoneOffset.UTC)
	}
}