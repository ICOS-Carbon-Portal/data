package se.lu.nateko.cp.data.formats.atcprod

import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import se.lu.nateko.cp.data.formats.TimeSeriesStreams.*
import se.lu.nateko.cp.data.formats.*
import se.lu.nateko.cp.data.services.upload.IngestionUploadTask.RowParser
import se.lu.nateko.cp.data.streams.KeepFuture
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract

import java.time.Instant
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import se.lu.nateko.cp.meta.core.data.TimeSeriesExtract
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.meta.core.data.TabularIngestionExtract
import se.lu.nateko.cp.meta.core.data.TimeInterval

object AtcProdStreams:
	import AtcProdParser.*

	val ProdFormatTimeCols = Seq("Year", "Month", "Day", "Hour", "Minute", "Second")
	val SampleStartCol = "SamplingStart"
	val SampleEndCol = "SamplingEnd"

	def flaskParser(colsMeta: ColumnsMeta, nRowsExplicit: Option[Int])(using ExecutionContext): RowParser =
		Flow[String]
			.scan(seed)(parseLine(colsMeta))
			.exposeParsingError
			.keepGoodRows
			.map: acc =>
				TableRow(
					TableRowHeader(acc.header.columnNames, nRowsExplicit.getOrElse(acc.header.nRows)),
					replaceNullValues(acc.cells, acc.formats)
				)
			.alsoToMat(
				digestSink(makeFlaskTsExtract(colsMeta))
			)(KeepFuture.right)

	def atcProdParser(format: ColumnsMetaWithTsCol, nRowsExplicit: Option[Int])(using ExecutionContext): RowParser =
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
		val timeIndices = ProdFormatTimeCols.map(cn => columnNames.indexOf(cn))

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

	private def makeFlaskTsExtract(colsMeta: ColumnsMeta)(
		fl: FirstLastRows
	)(using ExecutionContext): Future[TimeSeriesExtract] =
		def parseInstant(row: TableRow, col: String): Instant =
			val idx = row.header.columnNames.indexOf(col)
			assert(idx >= 0, s"Column '$col' not found (expected in ATC/CAL flask dataset)")
			inline def rowRender = row.cells.mkString(", ")
			assert(idx < row.cells.length, s"Too few columns in row: $rowRender")
			val ts = row.cells(idx)
			try Instant.parse(ts) catch case err =>
				throw CpDataParsingException(s"Bad timestamp: $ts in row: $rowRender")
		for f <- fl.first; l <- fl.last yield
			val interval = TimeInterval(parseInstant(f, SampleStartCol), parseInstant(l, SampleEndCol))
			val colNames = Some(l.header.columnNames.filter(colsMeta.matchesColumn).toIndexedSeq)
			TimeSeriesExtract(TabularIngestionExtract(colNames, interval), Some(l.header.nRows))

end AtcProdStreams
