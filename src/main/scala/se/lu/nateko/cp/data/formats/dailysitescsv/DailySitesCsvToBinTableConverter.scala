package se.lu.nateko.cp.data.formats.dailysitescsv

import java.time._
import java.util.Locale

import DailySitesCsvToBinTableConverter._
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.formats.{ColumnFormats, FloatValue, ValueFormat, ValueFormatParser}

class DailySitesCsvToBinTableConverter(colFormats: ColumnFormats) {

	protected def amend(value: String): String = value
	protected def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN"
		case _ => false
	}

	protected val sortedColumns = colFormats.sortedColumns

	protected val valueFormatParser = new ValueFormatParser(Locale.UK)

	def schema(nRows: Int) = {
		val dataTypes = sortedColumns.map(colFormats.valueFormats).map(valueFormatParser.getBinTableDataType)
		new Schema(dataTypes, nRows.toLong)
	}

	def parseCells(cells: Array[String], columnNames: Array[String]): Array[AnyRef] = {
		val colPositions: Map[String, Int] = computeIndices(columnNames)

		val parsed = sortedColumns.map{ colName =>
			if(colName == colFormats.timeStampColumn) null else {
				val valFormat = colFormats.valueFormats(colName)

				val colPos = try {
					colPositions(colName)
				} catch {
					case _: NoSuchElementException =>
						val missingColumns = colFormats.valueFormats.keys.filterNot(colPositions.contains).filter(_ != colFormats.timeStampColumn)
						throw new CpDataParsingException("Missing columns: " + missingColumns.mkString(", "))
				}

				val cellValue = cells(colPos)

				if(isNull(cellValue, valFormat)) getNull(valFormat)
				else valueFormatParser.parse(amend(cellValue), valFormat)
			}
		}
		parsed
	}

	protected def getNull(valFormat: ValueFormat) = valueFormatParser.getNullRepresentation(valFormat)

}

object DailySitesCsvToBinTableConverter {

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}

	def makeTimeStamp(dateCell: AnyRef, time: LocalTime): Instant = {
		val parsedTime = LocalDate.ofEpochDay(dateCell.asInstanceOf[Int].toLong).atTime(time)
		parsedTime.toInstant(ZoneOffset.ofHours(1))
	}

}
