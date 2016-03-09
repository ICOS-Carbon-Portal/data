package se.lu.nateko.cp.data.formats.wdcgg

import java.util.Locale

import scala.annotation.migration

import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.Schema

class ToBinTableConverter(colFormats: Map[String, ValueFormat], colNames: Array[String], nRows: Int) {

	private val colPositions: Map[String, Int] = colNames.zipWithIndex.groupBy(_._1).map{
		case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
	}

	private val missingColumns = colFormats.keys.filterNot(colPositions.contains)
	assert(missingColumns.isEmpty, "Missing columns: " + missingColumns.mkString(", "))

	private val valueFormatParser = new ValueFormatParser(Locale.UK)
	private val sortedColumns = colFormats.keys.toArray.sorted

	val schema = {
		val dataTypes = sortedColumns.map(colFormats).map(valueFormatParser.getBinTableDataType)
		new Schema(dataTypes, nRows)
	}

	def parseCells(cells: Array[String]): Array[AnyRef] = {
		sortedColumns.map{ colName =>
			val valFormat = colFormats(colName)
			val colPos = colPositions(colName)
			val cellValue = cells(colPos)

			if(ToBinTableConverter.isNull(cellValue, valFormat))
				valueFormatParser.getNullRepresentation(valFormat)
			else valueFormatParser.parse(cellValue, valFormat)
		}
	}
}

object ToBinTableConverter{

	private val floatNullRegex = "^\\-9+\\.9*$".r

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case IntValue => value == "-9999"
		case FloatValue => floatNullRegex.findFirstIn(value).isDefined
		case StringValue => value == null
		case Iso8601DateValue => value == "9999-99-99"
		case Iso8601TimeOfDayValue => value == "99:99"
	}
}
