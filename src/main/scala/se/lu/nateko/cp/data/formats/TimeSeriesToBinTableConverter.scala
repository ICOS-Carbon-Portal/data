package se.lu.nateko.cp.data.formats

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset
import java.util.Locale
import se.lu.nateko.cp.data.formats.bintable.Schema
import TimeSeriesToBinTableConverter._

abstract class TimeSeriesToBinTableConverter(colFormats: ColumnFormats, columnNames: Array[String], offsetFromUtc: Int, nRows: Int) {

	protected def amend(value: String, format: ValueFormat): String
	protected def isNull(value: String, format: ValueFormat): Boolean
	protected def timeCol: String
	protected def dateCol: String

	private val colPositions: Map[String, Int] = computeIndices(columnNames)

	private val missingColumns = {
		val expectedCols = (colFormats.keys.toSeq :+ timeCol :+ dateCol).distinct
		expectedCols.filterNot(colPositions.contains).filter(_ != timeStampCol)
	}
	assert(missingColumns.isEmpty, "Missing columns: " + missingColumns.mkString(", "))

	private val sortedColumns = getSortedColumns(colFormats)

	private val valueFormatParser = new ValueFormatParser(Locale.UK)

	val schema = {
		val dataTypes = sortedColumns.map(colFormats).map(valueFormatParser.getBinTableDataType)
		new Schema(dataTypes, nRows)
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
				else valueFormatParser.parse(amend(cellValue, valFormat), valFormat)
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
				if(time >= 86400){
					val locTime = LocalTime.ofSecondOfDay(time - 86400)
					LocalDateTime.of(locDate, locTime).plusHours(24 - offsetFromUtc)
				} else {
					val locTime = LocalTime.ofSecondOfDay(time)
					LocalDateTime.of(locDate, locTime).minusHours(offsetFromUtc)
				}
			Double.box(dt.toInstant(ZoneOffset.UTC).toEpochMilli)
		}

	private def getNull(valFormat: ValueFormat) = valueFormatParser.getNullRepresentation(valFormat)
}

object TimeSeriesToBinTableConverter{

	val timeStampCol = "TIMESTAMP"

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}

	def recoverTimeStamp(cells: Array[AnyRef], formats: ColumnFormats): Instant = {
		val sortedCols = getSortedColumns(formats)
		val stampColIndex = sortedCols.indexOf(timeStampCol)
		assert(stampColIndex >= 0, timeStampCol + " not found in:  ." + sortedCols.mkString(", "))
		val epochMilli = cells(stampColIndex).asInstanceOf[Double]
		Instant.ofEpochMilli(epochMilli.toLong)
	}

	private def getSortedColumns(formats: ColumnFormats): Array[String] =
		formats.keys.toArray.sorted
}
