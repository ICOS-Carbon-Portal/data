package se.lu.nateko.cp.data.formats.delimitedheadercsv

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Flow

import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats._
import scala.concurrent.Future
import java.time.Instant
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract
import akka.stream.scaladsl.Keep
import java.time.temporal.ChronoUnit
import java.time.{ Instant, LocalDateTime, ZoneOffset }
import java.time.format.DateTimeFormatter

object SitesDelimitedHeaderCsvStreams {
	import DelimitedHeaderCsvParser._

	private val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
	private val columnSeparator = ","
	private val headerDelimitor = "####"

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == ""
		case _ => false
	}

	def makeTimeStamp(cells: Array[String]): Instant =
		LocalDateTime.parse(cells(0), isoLikeDateFormater).toInstant(ZoneOffset.ofHours(1))

	/**
	 * Temporal step from the measurement's UTC time stamp (which is expected to be either at the beginning or at the end of the interval) to the other end of the data acquisition interval
	 */
	def acqIntervalTimeStep: Option[(Long, ChronoUnit)] = None

	def delimitedHeaderCsvParser(
		nRows: Int,
		format: ColumnsMetaWithTsCol
	)(implicit ctxt: ExecutionContext): Flow[String, TableRow, Future[IngestionMetadataExtract]] = {

		val parser = new DelimitedHeaderCsvParser(format.colsMeta, columnSeparator, headerDelimitor)

		Flow.apply[String]
			.scan(seed)(parser.parseLine)
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				TableRow(
					TableRowHeader(format.timeStampColumn +: acc.header.colNames, nRows),
					makeTimeStamp(acc.cells).toString +: replaceNullValues(acc)
				)
			)
			.alsoToMat(
				digestSink(getCompletionInfo(format.colsMeta, timeStep = acqIntervalTimeStep))
			)(Keep.right)
	}

	private def replaceNullValues(acc: Accumulator): Array[String] = acc.cells.indices
		.map{ i =>
			val cell = acc.cells(i)
			acc.header.formats(i).fold(cell){ valueFormat =>
				if (isNull(cell, valueFormat)) "" else cell
			}
		}
		.toArray

}
