package se.lu.nateko.cp.data.formats.wdcgg

import akka.NotUsed
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Framing
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.formats.ValueFormat
import akka.stream.scaladsl.Keep
import scala.concurrent.Future

class WdcggRow(val columnNames: Array[String], val nRows: Int, val cells: Array[String])

object TimeSeriesStreams{

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
		.map(_.utf8String.replace("\r", ""))

	def wdcggParser: Flow[String, WdcggRow, NotUsed] = Flow[String]
		.scan(TimeSeriesParser.seed)(TimeSeriesParser.parseLine)
		.dropWhile(acc => !acc.isOnData)
		.collect{
			case acc if (acc.cells.length == acc.columnNames.length) =>
				new WdcggRow(acc.columnNames, acc.totLength - acc.headerLength, acc.cells)
		}

	def wdcggToBinTableConverter(formats: Map[String, ValueFormat]): Flow[WdcggRow, BinTableRow, NotUsed] = Flow[WdcggRow]
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

	def wdcggHeaderSink: Sink[String, Future[Map[String, String]]] = Flow[String]
		.takeWhile(TimeSeriesParser.isHeaderLine)
		.fold(TimeSeriesParser.headerSeed)(TimeSeriesParser.parseHeaderLine)
		.map(_.result)
		.toMat(Sink.head)(Keep.right)
}
