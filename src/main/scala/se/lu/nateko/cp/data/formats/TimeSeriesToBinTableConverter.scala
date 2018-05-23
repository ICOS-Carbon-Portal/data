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
	protected val sortedColumns = colFormats.valueFormats.sortedColumns

	protected val valueFormatParser = new ValueFormatParser(Locale.UK)

	val schema = {
		val dataTypes = sortedColumns.map(colFormats.valueFormats).map(valueFormatParser.getBinTableDataType)
		new Schema(dataTypes, nRows.toLong)
	}

	private val stampPos = sortedColumns.indexOf(colFormats.timeStampColumn)
	if(stampPos < 0) throw new CpDataParsingException(
		s"Missing timestamp column ${colFormats.timeStampColumn} in the data object specification"
	)

	def parseCells(cells: Array[String]): Array[AnyRef] = {
		val parsed = sortedColumns.map{ colName =>
			if(colName == colFormats.timeStampColumn) null else {
				val valFormat = colFormats.valueFormats(colName)

				val colPos = try{
					colPositions(colName)
				} catch {
					case _: NoSuchElementException =>
						val missingColumns = colFormats.valueFormats.keys.filterNot(colPositions.contains)
							.filter(_ != colFormats.timeStampColumn).mkString(", ")
						val presentColumns = colPositions.keys.mkString(", ")
						throw new CpDataParsingException(s"Missing columns: $missingColumns (present columns: $presentColumns)\n")
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

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}

	def recoverTimeStamp(cells: Array[AnyRef], formats: ColumnFormats): Instant = {
		val sortedCols = formats.valueFormats.sortedColumns
		val stampColIndex = sortedCols.indexOf(formats.timeStampColumn)
		assert(stampColIndex >= 0, formats.timeStampColumn + " not found in:  ." + sortedCols.mkString(", "))
		val epochMilli = cells(stampColIndex).asInstanceOf[Double]
		Instant.ofEpochMilli(epochMilli.toLong)
	}

}
