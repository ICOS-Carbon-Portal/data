package se.lu.nateko.cp.data.formats.simplesitescsv

import java.time.format.DateTimeFormatter
import java.time.{LocalDateTime, ZoneOffset}

import se.lu.nateko.cp.data.formats._

class SimpleSitesCsvToBinTableConverter(
    colFormats: ColumnFormats,
    header: SimpleSitesCsvParser.Header,
    nRows: Int
  ) extends TimeSeriesToBinTableConverter(colFormats, header.columnNames, nRows) {
  override protected def amend(value: String, format: ValueFormat): String = value

  override protected def isNull(value: String, format: ValueFormat): Boolean = format match {
    case FloatValue => value == "NaN"
    case _ => false
  }

  override protected def getTimeStamp(cells: Array[String], parsed: Array[AnyRef]): AnyRef = {
    val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    // TODO: Make sure that the time zone is always CET (UTC+1)
    Double.box(LocalDateTime.parse(cells(0), isoLikeDateFormater).toInstant(ZoneOffset.ofHours(1)).toEpochMilli.toDouble)
  }
}
