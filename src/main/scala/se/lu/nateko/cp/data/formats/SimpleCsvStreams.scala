package se.lu.nateko.cp.data.formats

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Flow

import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import scala.concurrent.Future
import java.time.Instant
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract
import akka.stream.scaladsl.Keep
import se.lu.nateko.cp.meta.core.data.TimeSeriesUploadCompletion

abstract class SimpleCsvStreams(separator: String){
	import SimpleCsvParser._

	def isNull(value: String, format: ValueFormat): Boolean
	def makeTimeStamp(cells: Array[String]): Instant

	def completionInfoMaker(columnsMeta: ColumnsMeta)(implicit ctxt: ExecutionContext): FirstLastRows => Future[TimeSeriesUploadCompletion] =
		getCompletionInfo(columnsMeta)

	def simpleCsvParser(
		nRows: Int,
		format: ColumnsMetaWithTsCol
	)(implicit ctxt: ExecutionContext): Flow[String, TableRow, Future[IngestionMetadataExtract]] = {

		val parser = new SimpleCsvParser(format.colsMeta, separator)

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
				digestSink(completionInfoMaker(format.colsMeta))
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
