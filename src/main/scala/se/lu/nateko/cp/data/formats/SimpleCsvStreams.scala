package se.lu.nateko.cp.data.formats

import java.time.Instant
import se.lu.nateko.cp.data.formats.ColumnMeta
import scala.concurrent.ExecutionContext

abstract class SimpleCsvStreams(separator: String) extends StandardCsvStreams {
	
	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser =
		new SimpleCsvParser(format.colsMeta, separator)

}

class StandardCsvWithTimestampFirstCol(colsMeta: ColumnsMeta){

	private[this] object csvStreams extends SimpleCsvStreams(","){

		def isNull(value: String, format: ValueFormat): Boolean =
			(value == null || value.isEmpty)

		def makeTimeStamp(cells: Array[String]): Instant = Instant.parse(cells(0))
	}

	def getParser(nRows: Int)(using ExecutionContext) = csvStreams.standardCsvParser(nRows, ColumnsMetaWithTsCol(colsMeta, "TEMP_TS_DUMMY"))
}
