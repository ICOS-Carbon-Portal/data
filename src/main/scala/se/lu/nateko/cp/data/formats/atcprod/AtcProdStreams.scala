package se.lu.nateko.cp.data.formats.atcprod

import java.time.Instant

import scala.concurrent.{ ExecutionContext, Future }

import akka.stream.scaladsl.{ Flow, Keep }
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract
import se.lu.nateko.cp.data.streams.KeepFuture

object AtcProdStreams {
	import AtcProdParser._

	def atcProdParser(format: ColumnsMetaWithTsCol, nRowsExplicit: Option[Int] = None)(implicit ctxt: ExecutionContext)
	: Flow[String, TableRow, Future[IngestionMetadataExtract]] =
		Flow[String]
			.scan(seed)(parseLine(format.colsMeta))
			.exposeParsingError
			.keepGoodRows
			.map(acc => {
				TableRow(
					TableRowHeader(format.timeStampColumn +: acc.header.columnNames, nRowsExplicit.getOrElse(acc.header.nRows)),
					makeTimeStamp(acc.cells, acc.header.columnNames).toString +: replaceNullValues(acc.cells, acc.formats)
				)
			})
			.alsoToMat(
				digestSink(getCompletionInfo(format.colsMeta, provideNRows = true))
			)(KeepFuture.right)

	private def makeTimeStamp(cells: Array[String], columnNames: Array[String]): Instant = {
		val timeIndices = Seq("Year", "Month", "Day", "Hour", "Minute", "Second").map(cn => columnNames.indexOf(cn))

		def pad0(s: String) = if (s.length == 1) "0" + s else s

		val Seq(year, month, day, hour, min, sec) = timeIndices.map { idx =>
			if (idx >= 0) pad0(cells(idx)) else "00"
		}
		Instant.parse(s"$year-$month-${day}T$hour:$min:${sec}Z")
	}

	private def replaceNullValues(cells: Array[String], formats: Array[Option[ValueFormat]]): Array[String] = {
		cells.zip(formats).map {
			case (cell, None) => cell
			case (cell, Some(valueFormat)) => if (isNull(cell, valueFormat)) "" else cell
		}
	}
}
