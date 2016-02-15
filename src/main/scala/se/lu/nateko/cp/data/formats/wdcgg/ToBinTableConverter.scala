package se.lu.nateko.cp.data.formats.wdcgg

import java.util.Locale

import scala.annotation.migration

import se.lu.nateko.cp.data.formats.ValueFormat
import se.lu.nateko.cp.data.formats.ValueFormatParser
import se.lu.nateko.cp.data.formats.bintable.Schema

class ToBinTableConverter(colFormats: Map[String, ValueFormat], colNames: Array[String]) {

	private val colPositions: Map[String, Int] = colNames.zipWithIndex.groupBy(_._1).map{
		case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
	}

	private val missingColumns = colFormats.keys.filterNot(colPositions.contains)
	assert(missingColumns.isEmpty, "Missing columns: " + missingColumns.mkString(", "))

	private val valueFormatParser = new ValueFormatParser(Locale.UK)

	private val sortedColumns = colFormats.keys.toArray.sorted

	def getBinTableSchema(nRows: Int): Schema = {
		val dataTypes = sortedColumns.map(colFormats).map(valueFormatParser.getBinTableDataType)
		new Schema(dataTypes, nRows)
	}

	def parseCells(cells: Array[String]): Array[AnyRef] = {
		sortedColumns.map{ colName =>
			val valFormat = colFormats(colName)
			val colPos = colPositions(colName)
			val cellValue = cells(colPos)
			valueFormatParser.parse(cellValue, valFormat)
		}
	}

	val isEmpty = colNames.isEmpty
}

object ToBinTableConverter{
	def empty = new ToBinTableConverter(Map.empty, Array.empty)
}