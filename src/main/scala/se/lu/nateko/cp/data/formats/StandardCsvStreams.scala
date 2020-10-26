package se.lu.nateko.cp.data.formats

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Flow

import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import scala.concurrent.Future
import java.time.Instant
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract
import akka.stream.scaladsl.Keep
import java.time.temporal.ChronoUnit
import akka.protobufv3.internal.Value

abstract class StandardCsvStreams {

	def isNull(value: String, format: ValueFormat): Boolean
	def makeTimeStamp(cells: Array[String], timestampValueFormat: Option[ValueFormat]): Instant

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser

	def getTimestampValueFormat(colsMeta: ColumnsMeta): Option[ValueFormat] = None
	
	/**
	 * Temporal step from the measurement's UTC time stamp (which is expected to be either at the beginning or at the end of the interval) to the other end of the data acquisition interval
	 */
	def acqIntervalTimeStep(timestampValueFormat: Option[ValueFormat]): Option[(Long, ChronoUnit)] = None

	def standardCsvParser[T](
		nRows: Int,
		format: ColumnsMetaWithTsCol
	)(implicit ctxt: ExecutionContext): Flow[String, TableRow, Future[IngestionMetadataExtract]] = {

		val parser = makeParser(format)
		val timestampValueFormat = getTimestampValueFormat(format.colsMeta)

		Flow.apply[String]
			.scan(parser.seed)(parser.parseLine)
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				TableRow(
					TableRowHeader(format.timeStampColumn +: acc.header.colNames, nRows),
					makeTimeStamp(acc.cells, timestampValueFormat).toString +: replaceNullValues(acc)
				)
			)
			.alsoToMat(
				digestSink(getCompletionInfo(format.colsMeta, timeStep = acqIntervalTimeStep(timestampValueFormat)))
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
