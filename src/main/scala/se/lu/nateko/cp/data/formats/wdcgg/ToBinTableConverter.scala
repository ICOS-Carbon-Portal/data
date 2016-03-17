package se.lu.nateko.cp.data.formats.wdcgg

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset
import java.util.Locale
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.formats.wdcgg.TimeSeriesParser.Header
import ToBinTableConverter._
import java.time.Instant

class ToBinTableConverter(colFormats: Formats, header: Header) {

	private val colPositions: Map[String, Int] = computeIndices(header.columnNames)

	private val missingColumns = {
		val expectedCols = (colFormats.keys.toSeq :+ timeCol :+ dateCol).distinct
		expectedCols.filterNot(colPositions.contains).filter(_ != timeStampCol)
	}
	assert(missingColumns.isEmpty, "Missing columns: " + missingColumns.mkString(", "))

	private val sortedColumns = getSortedColumns(colFormats)

	private val valueFormatParser = new ValueFormatParser(Locale.UK)

	val schema = {
		val dataTypes = sortedColumns.map(colFormats).map(valueFormatParser.getBinTableDataType)
		new Schema(dataTypes, header.nRows)
	}

	private val Seq(stampPos, timePos, datePos) = {
		val sortedColPositions = computeIndices(sortedColumns)
		Seq(timeStampCol, timeCol, dateCol).map(sortedColPositions.apply)
	}

	def parseCells(cells: Array[String]): Array[AnyRef] = {
		val parsed = sortedColumns.map{ colName =>
			if(colName == timeStampCol) null else {
				val valFormat = colFormats(colName)
				val colPos = colPositions(colName)
				val cellValue = cells(colPos)

				if(isNull(cellValue, valFormat)) getNull(valFormat)
				else valueFormatParser.parse(cellValue, valFormat)
			}
		}
		val date = parsed(datePos).asInstanceOf[Int]
		val time = parsed(timePos).asInstanceOf[Int]
		parsed(stampPos) = getTimeStamp(date, time)
		parsed
	}

	private val Seq(dateNull, timeNull, stampNull) = Seq(dateCol, timeCol, timeStampCol)
		.map(col => getNull(colFormats(col)))

	private def getTimeStamp(date: Int, time: Int): AnyRef =
		if(date == dateNull || time == timeNull) stampNull
		else{
			val locDate = LocalDate.ofEpochDay(date)

			val dt =
				if(time == 86400){
					val locTime = LocalTime.ofSecondOfDay(0)
					LocalDateTime.of(locDate, locTime).plusHours(24 - header.offsetFromUtc)
				} else {
					val locTime = LocalTime.ofSecondOfDay(time)
					LocalDateTime.of(locDate, locTime).minusHours(header.offsetFromUtc)
				}
			Double.box(dt.toInstant(ZoneOffset.UTC).toEpochMilli)
		}

	private def getNull(valFormat: ValueFormat) = valueFormatParser.getNullRepresentation(valFormat)
}

object ToBinTableConverter{

	type Formats = Map[String, ValueFormat]

	val timeStampCol = "TIMESTAMP"
	private val timeCol = "TIME"
	private val dateCol = "DATE"
	private val floatNullRegex = "^\\-9+\\.9*$".r
	private val nullDates = Set("99-99", "02-30", "04-31", "06-31", "09-31", "11-31")

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case IntValue => value == "-9999"
		case FloatValue => floatNullRegex.findFirstIn(value).isDefined
		case StringValue => value == null
		case Iso8601Date => nullDates.contains(value.substring(5))
		case Iso8601DateTime => false //does not occur in WDCGG
		case Iso8601TimeOfDay => value == "99:99"
	}

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}

	def recoverTimeStamp(cells: Array[AnyRef], formats: Formats): Instant = {
		val sortedCols = getSortedColumns(formats)
		val stampColIndex = sortedCols.indexOf(timeStampCol)
		assert(stampColIndex >= 0, timeStampCol + " not found in:  ." + sortedCols.mkString(", "))
		val epochMilli = cells(stampColIndex).asInstanceOf[Double]
		Instant.ofEpochMilli(epochMilli.toLong)
	}

	private def getSortedColumns(formats: Formats): Array[String] =
		formats.keys.toArray.sorted
}
