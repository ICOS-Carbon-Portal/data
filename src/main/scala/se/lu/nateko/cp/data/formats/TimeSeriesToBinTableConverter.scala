package se.lu.nateko.cp.data.formats

import java.time.Instant
import java.util.Locale

import TimeSeriesToBinTableConverter._
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.api.CpDataParsingException

abstract class TimeSeriesToBinTableConverter(colFormats: ColumnFormats, columnNames: Array[String], nRows: Int) {

	protected def amend(value: String, format: ValueFormat): String
	protected def isNull(value: String, format: ValueFormat): Boolean
	protected def getTimeStamp(cells: Array[String], parsed: Array[AnyRef]): AnyRef

	protected val colPositions: Map[String, Int] = computeIndices(columnNames)
	protected val sortedColumns = colFormats.sortedColumns

	protected val valueFormatParser = new ValueFormatParser(Locale.UK)

	val schema = {
		val dataTypes = sortedColumns.map(colFormats).map(valueFormatParser.getBinTableDataType)
		new Schema(dataTypes, nRows.toLong)
	}

	private val stampPos = sortedColumns.indexOf(timeStampCol)

	def parseCells(cells: Array[String]): Array[AnyRef] = {
		val parsed = sortedColumns.map{ colName =>
			if(colName == timeStampCol) null else {
				val valFormat = colFormats(colName)

				val colPos = try{
					colPositions(colName)
				} catch {
					case _: NoSuchElementException =>
						val missingColumns = colFormats.keys.filterNot(colPositions.contains).filter(_ != timeStampCol)
						throw new CpDataParsingException("Missing columns: " + missingColumns.mkString(", "))
				}

				val cellValue = cells(colPos)

				if(isNull(cellValue, valFormat)) getNull(valFormat)
				else valueFormatParser.parse(amend(cellValue, valFormat), valFormat)
			}
		}
		parsed(stampPos) = getTimeStamp(cells, parsed)
		parsed
	}

	protected def getNull(valFormat: ValueFormat) = valueFormatParser.getNullRepresentation(valFormat)

}

object TimeSeriesToBinTableConverter{

	val timeStampCol = "TIMESTAMP"

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}

	def recoverTimeStamp(cells: Array[AnyRef], formats: ColumnFormats): Instant = {
		val sortedCols = formats.sortedColumns
		val stampColIndex = sortedCols.indexOf(timeStampCol)
		assert(stampColIndex >= 0, timeStampCol + " not found in:  ." + sortedCols.mkString(", "))
		val epochMilli = cells(stampColIndex).asInstanceOf[Double]
		Instant.ofEpochMilli(epochMilli.toLong)
	}

}
