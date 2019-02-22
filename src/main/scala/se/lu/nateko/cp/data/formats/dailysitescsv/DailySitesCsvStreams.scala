package se.lu.nateko.cp.data.formats.dailysitescsv

import java.time.{ Instant, LocalDate, LocalTime, ZoneOffset }
import java.time.temporal.ChronoUnit

import scala.concurrent.{ ExecutionContext, Future }

import akka.stream.scaladsl.{ Flow, Keep }
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract

object DailySitesCsvStreams {

	def dailySitesCsvParser(nRows: Int, format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext)
	: Flow[String, TableRow, Future[IngestionMetadataExtract]] = {

		val parser = new DailySitesCsvParser(nRows)

		Flow.apply[String]
			.scan(parser.seed)(parser.parseLine)
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				TableRow(
					acc.header.copy(columnNames = format.timeStampColumn +: acc.header.columnNames),
					makeTimeStamp(acc.cells(0)).toString +: acc.cells
				)
			)
			.alsoToMat(
				digestSink(getCompletionInfo(format.colsMeta, timeStepUnit = Some(ChronoUnit.DAYS)))
			)(Keep.right)
	}

	private def makeTimeStamp(localDate: String): Instant = {
		val parsedTime = LocalDate.parse(localDate).atTime(LocalTime.MIN)
		parsedTime.toInstant(ZoneOffset.ofHours(1))
	}

}
