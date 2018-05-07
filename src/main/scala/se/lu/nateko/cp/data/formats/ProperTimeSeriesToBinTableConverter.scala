package se.lu.nateko.cp.data.formats

import java.util.Locale

import ProperTimeSeriesToBinTableConverter._
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.bintable.{BinTableRow, Schema}

abstract class ProperTimeSeriesToBinTableConverter(valueFormats: ColumnValueFormats) {

	protected def amend(value: String): String = value
	protected def isNull(value: String, format: ValueFormat): Boolean

	private val sortedColumns = valueFormats.sortedColumns

	protected val valueFormatParser = new ValueFormatParser(Locale.UK)
	private val dataTypes = sortedColumns.map(valueFormats.valueFormats).map(valueFormatParser.getBinTableDataType)

	def parseRow(row: ProperTableRow): BinTableRow = {
		val colPositions: Map[String, Int] = computeIndices(row.header.columnNames)

		val parsed = sortedColumns.map{ colName =>
			val valFormat = valueFormats.valueFormats(colName)

			val colPos = try {
				colPositions(colName)
			} catch {
				case _: NoSuchElementException =>
					val missingColumns = valueFormats.valueFormats.keys.filterNot(colPositions.contains)
					throw new CpDataParsingException("Missing columns: " + missingColumns.mkString(", "))
			}

			val cellValue = row.cells(colPos)

			if(isNull(cellValue, valFormat)) getNull(valFormat)
			else valueFormatParser.parse(amend(cellValue), valFormat)
		}
		new BinTableRow(parsed, new Schema(dataTypes, row.header.nRows.toLong))
	}

	private def getNull(valFormat: ValueFormat) = valueFormatParser.getNullRepresentation(valFormat)

}

object ProperTimeSeriesToBinTableConverter {

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}

}
