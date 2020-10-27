package se.lu.nateko.cp.data.formats

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Flow

import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import scala.concurrent.Future
import java.time.Instant
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract
import akka.stream.scaladsl.Keep
import java.time.temporal.ChronoUnit

abstract class StandardCsvStreams {
	def isNull(value: String, format: ValueFormat): Boolean
	def makeTimeStamp(cells: Array[String]): Instant

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser
	
	/**
	 * Temporal step from the measurement's UTC time stamp (which is expected to be either at the beginning or at the end of the interval) to the other end of the data acquisition interval
	 */
	def acqIntervalTimeStep: Option[(Long, ChronoUnit)] = None

	def standardCsvParser[T](
		nRows: Int,
		format: ColumnsMetaWithTsCol
	)(implicit ctxt: ExecutionContext): Flow[String, TableRow, Future[IngestionMetadataExtract]] = {

		val parser = makeParser(format)

		Flow.apply[String]
			.scan(parser.seed)(parser.parseLine)
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

	private def replaceNullValues(acc: StandardParsingAcculumator): Array[String] = acc.cells.indices
		.map{ i =>
			val cell = acc.cells(i)
			acc.header.formats(i).fold(cell){ valueFormat =>
				if (isNull(cell, valueFormat)) "" else cell
			}
		}
		.toArray

}
