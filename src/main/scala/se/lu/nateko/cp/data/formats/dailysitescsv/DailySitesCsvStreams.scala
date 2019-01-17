package se.lu.nateko.cp.data.formats.dailysitescsv

import java.time.{Instant, LocalDate, LocalTime, ZoneOffset}

import akka.stream.scaladsl.{Flow, Framing, Keep, Sink}
import akka.util.ByteString
import akka.{Done, NotUsed}
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.{ColumnsMeta, ProperTableRow, ProperTableRowHeader}
import se.lu.nateko.cp.meta.core.data.{TimeInterval, TimeSeriesUploadCompletion}

import scala.concurrent.{ExecutionContext, Future}

object DailySitesCsvStreams {
	import se.lu.nateko.cp.data.formats.TimeSeriesStreams.TimeSeriesParserEnhancer

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 8192, allowTruncation = true)
		.map(_.utf8String.trim)

	def dailySitesCsvParser(nRows: Int)(implicit ctxt: ExecutionContext): Flow[String, ProperTableRow, Future[Done]] = {
		val parser = new DailySitesCsvParser(nRows)

		Flow.apply[String]
			.scan(parser.seed)(parser.parseLine)
			.exposeParsingError
			.keepGoodRows
			.map(acc => ProperTableRow(acc.header, acc.cells))
	}

	def dailySitesCsvToBinTableConverter[H <: ProperTableRowHeader](
		formats: ColumnsMeta
	)(implicit ctxt: ExecutionContext): Flow[ProperTableRow, BinTableRow, Future[TimeSeriesUploadCompletion]] = {
		val conv = new DailySitesCsvToBinTableConverter(formats)

		val completionInfoSink: Sink[ProperTableRow, Future[TimeSeriesUploadCompletion]] = Flow.apply[ProperTableRow]
  		.wireTapMat(Sink.head)(Keep.right)
  		.toMat(Sink.last)(getCompletionInfo())

		Flow.apply[ProperTableRow]
			.alsoToMat(completionInfoSink)(Keep.right)
			.map(conv.parseRow)
	}

	private def getCompletionInfo()(
		firstBinFut: Future[ProperTableRow],
		lastBinFut: Future[ProperTableRow]
	)(implicit ctxt: ExecutionContext): Future[TimeSeriesUploadCompletion] =
		for (
			firstBin <- firstBinFut;
			lastBin <- lastBinFut
		) yield {
			val start = makeTimeStampFromRow(firstBin, LocalTime.MIN)
			val stop = makeTimeStampFromRow(lastBin, LocalTime.MAX)
			TimeSeriesUploadCompletion(TimeInterval(start, stop), None)
		}

	private def makeTimeStampFromRow(row: ProperTableRow, time: LocalTime): Instant = {
		val parsedTime = LocalDate.parse(row.cells(0)).atTime(time)
		parsedTime.toInstant(ZoneOffset.ofHours(1))
	}

}
