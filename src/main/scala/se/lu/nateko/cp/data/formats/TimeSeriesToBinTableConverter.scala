package se.lu.nateko.cp.data.formats

import TimeSeriesToBinTableConverter._
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.bintable.{BinTableRow, Schema}
import java.{util => ju}

//Instances of this class must not be reused for parsing different tables
class TimeSeriesToBinTableConverter(colsMeta: ColumnsMeta) {

	private var parser: Parser = null

	def parseRow(row: TableRow): BinTableRow = {
		if(parser == null) parser = new Parser(row.header)
		parser.parse(row)
	}

	private class Parser(header: TableRowHeader){

		assertNoMissingColumns()
		private val valueFormatParser = new ValueFormatParser

		private val (sortedCols, sortedFormats) = {
			val sortedColsAndFormats: Array[(String, ValueFormat)] = header.columnNames.sorted.flatMap{cname =>
				colsMeta.matchColumn(cname)
					.map(valueFormat => cname -> valueFormat) //Option[String -> ValueFormat]
			}
			sortedColsAndFormats.map(_._1) -> sortedColsAndFormats.map(_._2)
		}

		private val schema = new Schema(
			sortedFormats.map(valueFormatParser.getBinTableDataType),
			header.nRows.toLong
		)

		private val indices: Array[Int] = {
			val lookup = computeIndices(header.columnNames)
			sortedCols.map(lookup.apply)
		}

		def parse(row: TableRow): BinTableRow = {
			assertConsistency(row.header)

			val parsed = Array.ofDim[AnyRef](indices.length)

			for(i <- parsed.indices){
				val cellValue = row.cells(indices(i))
				val valueFormat = sortedFormats(i)
				parsed(i) = valueFormatParser.parse(cellValue, valueFormat)
			}

			new BinTableRow(parsed, schema)
		}

		private def assertConsistency(latestHeader: TableRowHeader): Unit = if(
			(header ne latestHeader) && (
				header.nRows != latestHeader.nRows ||
				!ju.Arrays.equals(
					header.columnNames.asInstanceOf[Array[AnyRef]],
					latestHeader.columnNames.asInstanceOf[Array[AnyRef]]
				)
			)
		) throw new CpDataParsingException(
			"Sequential rows had different headers. Could be due to reuse of TimeSeriesToBinTableConverter instance. Contact developers."
		)

		private def assertNoMissingColumns(): Unit = {
			val missingColumns = colsMeta.findMissingColumns(header.columnNames).map(_.toString)
			if(!missingColumns.isEmpty) throw new CpDataParsingException(
				s"Required columns were missing in the data: ${missingColumns.mkString(", ")}"
			)
		}
	}

}

object TimeSeriesToBinTableConverter {

	def computeIndices(strings: Array[String]): Map[String, Int] = {
		strings.zipWithIndex.groupBy(_._1).map{
			case (colName, nameIndexPairs) => (colName, nameIndexPairs.map(_._2).min)
		}
	}
}
