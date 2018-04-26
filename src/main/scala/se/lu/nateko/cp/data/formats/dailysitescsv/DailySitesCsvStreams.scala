package se.lu.nateko.cp.data.formats.dailysitescsv

import java.time.LocalTime

import DailySitesCsvParser.{Header, parseLine, seed}
import akka.stream.scaladsl.{Flow, Framing, Keep, Sink}
import akka.util.ByteString
import akka.{Done, NotUsed}
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.{ColumnFormats, ParsingAccumulator, ProperTableRow, ProperTableRowHeader}
import se.lu.nateko.cp.meta.core.data.{TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

class DailySitesCsvRow(val header: Header, val cells: Array[String]) extends ProperTableRow[Header]

object DailySitesCsvStreams {
	implicit class TimeSeriesParserEnhancer[A <: ParsingAccumulator, M](val parser: Flow[String, A, M]) extends AnyVal {

		def exposeParsingError(implicit ctxt: ExecutionContext): Flow[String, A, Future[Done]] = {

			val errorSink: Sink[A, Future[Done]] = Flow.apply[A]
				.filter(_.error.isDefined)
				.toMat(Sink.headOption){(_, err) =>
					err.flatMap{
						_.flatMap(_.error).fold(Future.successful(Done))(Future.failed)
					}
				}
			parser.alsoToMat(errorSink)(Keep.right)
		}

		def keepGoodRows: Flow[String, A, M] = parser.filter(acc => acc.isOnData && acc.error.isEmpty)
	}

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 8192, allowTruncation = true)
		.map(_.utf8String.trim)

	def dailySitesCsvParser(implicit ctxt: ExecutionContext): Flow[String, DailySitesCsvRow, Future[Done]] = Flow.apply[String]
		.scan(seed)(parseLine)
		.exposeParsingError
		.keepGoodRows
		.map(acc => new DailySitesCsvRow(acc.header, acc.cells))

	def dailySitesCsvToBinTableConverter[H <: ProperTableRowHeader](
		nRows: Int,
		formats: ColumnFormats
	)(implicit ctxt: ExecutionContext): Flow[DailySitesCsvRow, BinTableRow, Future[TimeSeriesUploadCompletion]] = {
		val conv = new DailySitesCsvToBinTableConverter(formats)

		val completionInfoSink: Sink[BinTableRow, Future[TimeSeriesUploadCompletion]] = Flow.apply[BinTableRow]
  		.wireTapMat(Sink.head)(Keep.right)
  		.toMat(Sink.last)(getCompletionInfo())

		Flow.apply[DailySitesCsvRow].map{ row =>
			new BinTableRow(conv.parseCells(row.cells, row.header.columnNames), conv.schema(nRows))
		}.alsoToMat(completionInfoSink)(Keep.right)
	}

	private def getCompletionInfo()(
		firstBinFut: Future[BinTableRow],
		lastBinFut: Future[BinTableRow]
	)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield {
			val start = DailySitesCsvToBinTableConverter.makeTimeStamp(firstBin.cells(0), LocalTime.MIN)
			val stop = DailySitesCsvToBinTableConverter.makeTimeStamp(lastBin.cells(0), LocalTime.MAX)
			TimeSeriesUploadCompletion(TimeInterval(start, stop), None)
		}
}
