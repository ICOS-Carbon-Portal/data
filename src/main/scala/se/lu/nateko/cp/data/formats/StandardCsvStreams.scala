package se.lu.nateko.cp.data.formats

import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import se.lu.nateko.cp.data.formats.TimeSeriesStreams.*
import se.lu.nateko.cp.data.services.upload.IngestionUploadTask.RowParser
import se.lu.nateko.cp.data.streams.KeepFuture
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract

import java.time.Instant
import java.time.temporal.ChronoUnit
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import se.lu.nateko.cp.data.api.CpDataParsingException

trait StandardCsvStreams:
	self =>
	def isNull(value: String, format: ValueFormat): Boolean
	def makeTimeStamp(cells: Array[String]): Instant

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser

	/**
	 * Temporal step from the measurement's UTC time stamp (which is expected to be either at the beginning or at the end of the interval) to the other end of the data acquisition interval
	 */
	def acqIntervalTimeStep: Option[(Long, ChronoUnit)] = None

	def standardCsvParser[T](nRows: Int, format: ColumnsMetaWithTsCol)(using ExecutionContext): RowParser =

		val parser = makeParser(format)

		def parseLine(acc: parser.A, line: String): parser.A =
			withParsingErrorCtxt(line, acc.lineNumber):
				val result = parser.parseLine(acc, line)
				result.lineNumber = acc.lineNumber + 1
				result

		def makeTimeStamp(acc: parser.A): String =
			withParsingErrorCtxt(acc.cells.mkString(", "), acc.lineNumber):
				self.makeTimeStamp(acc.cells).toString

		Flow.apply[String]
			.scan(parser.seed)(parseLine)
			.exposeParsingError
			.keepGoodRows
			.map(acc =>
				TableRow(
					TableRowHeader(format.timeStampColumn +: acc.header.colNames, nRows),
					makeTimeStamp(acc) +: replaceNullValues(acc)
				)
			)
			.alsoToMat(
				digestSink(getCompletionInfo(format.colsMeta, timeStep = acqIntervalTimeStep))
			)(KeepFuture.right)
	end standardCsvParser

	private def withParsingErrorCtxt[T](line: String, lineNumber: Int)(work: => T): T =
		try
			work
		catch case error: Throwable =>
			val message = s"Parsing error on line $lineNumber \"$line\" (${error.getMessage})"
			throw CpDataParsingException(message)

	private def replaceNullValues(acc: StandardParsingAcculumator): Array[String] = acc.cells.indices
		.map{ i =>
			val cell = acc.cells(i)
			acc.header.formats(i).fold(cell){ valueFormat =>
				if (isNull(cell, valueFormat)) "" else cell
			}
		}
		.toArray

end StandardCsvStreams
