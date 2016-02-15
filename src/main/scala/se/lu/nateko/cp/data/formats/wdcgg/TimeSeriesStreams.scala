package se.lu.nateko.cp.data.formats.wdcgg

import akka.stream.scaladsl.Flow
import se.lu.nateko.cp.data.formats.ValueFormat
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.bintable.Schema
import akka.util.ByteString
import akka.stream.io.Framing

class WdcggRow(val columnNames: Array[String], val nRows: Int, val cells: Array[String])

object TimeSeriesStreams{

	def linesFromBinary: Flow[ByteString, String, Unit] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
		.map(_.utf8String.trim)

	def wdcggParser: Flow[String, WdcggRow, Unit] = Flow[String]
		.scan(TimeSeriesParser.seed)(TimeSeriesParser.parseLine)
		.dropWhile(acc => !acc.isOnData)
		.map(acc => new WdcggRow(acc.columnNames, acc.totLength - acc.headerLength, acc.cells))

	def wdcggToBinTableConverter(formats: Map[String, ValueFormat]): Flow[WdcggRow, BinTableRow, Unit] = Flow[WdcggRow]
		.scan((ToBinTableConverter.empty, emptyRow)){
			case ((conv, row), nextRow) =>
				if(conv.isEmpty){
					val converter = new ToBinTableConverter(formats, nextRow.columnNames)
					val schema = converter.getBinTableSchema(nextRow.nRows)
					val cells = converter.parseCells(nextRow.cells)
					(converter, new BinTableRow(cells, schema))
				} else (conv, new BinTableRow(conv.parseCells(nextRow.cells), row.schema))
		}
		.drop(1)
		.map(_._2)

	private def emptyRow = new BinTableRow(Array.empty, new Schema(Array.empty, 0))
}
