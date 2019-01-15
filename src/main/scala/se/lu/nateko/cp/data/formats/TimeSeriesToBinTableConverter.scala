package se.lu.nateko.cp.data.formats

import java.time.Instant
import java.util.Locale

import TimeSeriesToBinTableConverter._
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.api.CpDataParsingException

abstract class TimeSeriesToBinTableConverter(colFormats: ColumnsMetaWithTsCol, columnNames: Array[String], nRows: Int) {

	protected def amend(value: String, format: ValueFormat): String
	protected def isNull(value: String, format: ValueFormat): Boolean
	protected def getTimeStamp(cells: Array[String], parsed: Array[AnyRef]): AnyRef

	protected val colPositions: Map[String, Int] = computeIndices(columnNames)

	private val valueFormats: Map[String, ValueFormat] = columnNames.flatMap{cname =>
		colFormats.colsMeta.matchColumn(cname)
			.map(valueFormat => cname -> valueFormat) //Option[String -> ValueFormat]
	}.toMap

	protected val sortedColumns = valueFormats.keys.toArray.sorted

	protected val valueFormatParser = new ValueFormatParser(Locale.UK)

	val schema = {
		val dataTypes = sortedColumns.map(valueFormats).map(valueFormatParser.getBinTableDataType)
		new Schema(dataTypes, nRows.toLong)
	}

	private val stampPos = sortedColumns.indexOf(colFormats.timeStampColumn)
	if(stampPos < 0) throw new CpDataParsingException(
		s"Missing timestamp column ${colFormats.timeStampColumn} in the data object specification"
	)

	private val missingColumns = colFormats.colsMeta.findMissingColumns(columnNames)
	if (missingColumns.nonEmpty) throw new CpDataParsingException(
		s"Missing columns: $missingColumns (present columns: $columnNames)\n"
	)

	private val parseInfos: Array[ParseInfo] = sortedColumns.map(columnName =>
		new ParseInfo(colPositions(columnName), valueFormats(columnName))
	)

	def parseCells(cells: Array[String]): Array[AnyRef] = {
			if(cells.length != columnNames.length) throw new CpDataParsingException(
				s"Wrong number of columns in a row. Expected ${columnNames.length}, got ${cells.length}"
			)
			val parsed = parseInfos.map{pi =>
				val cellValue = cells(pi.idx)
				if(isNull(cellValue, pi.format)) getNull(pi.format)
				else valueFormatParser.parse(amend(cellValue, pi.format), pi.format)
			}
//		val parsed = sortedColumns.map{ colName =>
//			if(colName == colFormats.timeStampColumn) null else {
//				val valFormat = valueFormats(colName)
//
//				val colPos = try{
//					colPositions(colName)
//				} catch {
//					case _: NoSuchElementException =>
//						val missingColumns = valueFormats.keys.filterNot(colPositions.contains)
//							.filter(_ != colFormats.timeStampColumn).mkString(", ")
//						val presentColumns = colPositions.keys.mkString(", ")
//						throw new CpDataParsingException(s"Missing columns: $missingColumns (present columns: $presentColumns)\n")
//				}
//
//				val cellValue = cells(colPos)
//
//				if(isNull(cellValue, valFormat)) getNull(valFormat)
//				else valueFormatParser.parse(amend(cellValue, valFormat), valFormat)
//			}
//		}
		parsed(stampPos) = getTimeStamp(cells, parsed)
		parsed
	}

	protected def getNull(valFormat: ValueFormat) = valueFormatParser.getNullRepresentation(valFormat)

}

object TimeSeriesToBinTableConverter{

	class ParseInfo(val idx: Int, val format: ValueFormat)

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}

	def recoverTimeStamp(cells: Array[AnyRef], sortedColumns: Array[String], timeStampColumn: String): Instant = {
		val stampColIndex = sortedColumns.indexOf(timeStampColumn)
		assert(stampColIndex >= 0, timeStampColumn + " not found in:  ." + sortedColumns.mkString(", "))
		val epochMilli = cells(stampColIndex).asInstanceOf[Double]
		Instant.ofEpochMilli(epochMilli.toLong)
	}

}
