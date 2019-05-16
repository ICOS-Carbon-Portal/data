package se.lu.nateko.cp.data.formats

import java.util.Locale

import TimeSeriesToBinTableConverter._
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.bintable.{BinTableRow, Schema}

class TimeSeriesToBinTableConverter(colsMeta: ColumnsMeta) {

	protected val valueFormatParser = new ValueFormatParser

	def parseRow(row: TableRow): BinTableRow = {
		val colPositions: Map[String, Int] = computeIndices(row.header.columnNames)

		val valueFormats: Map[String, ValueFormat] = row.header.columnNames.flatMap{cname =>
			colsMeta.matchColumn(cname)
				.map(valueFormat => cname -> valueFormat) //Option[String -> ValueFormat]
		}.toMap

		val sortedColumns = valueFormats.keys.toArray.sorted
		val dataTypes = sortedColumns.map(valueFormats).map(valueFormatParser.getBinTableDataType)

		val parsed = sortedColumns.map{ colName =>
			val valFormat = valueFormats(colName)

			val colPos = try {
				colPositions(colName)
			} catch {
				case _: NoSuchElementException =>
					val missingColumns = valueFormats.keys.filterNot(colPositions.contains)
					throw new CpDataParsingException("Missing columns: " + missingColumns.mkString(", "))
			}

			val cellValue = row.cells(colPos)
			valueFormatParser.parse(cellValue, valFormat)
		}
		new BinTableRow(parsed, new Schema(dataTypes, row.header.nRows.toLong))
	}

}

object TimeSeriesToBinTableConverter {

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}

}
