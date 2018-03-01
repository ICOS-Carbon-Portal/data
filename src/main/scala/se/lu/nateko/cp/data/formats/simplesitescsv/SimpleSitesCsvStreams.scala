package se.lu.nateko.cp.data.formats.simplesitescsv

import SimpleSitesCsvParser._
import akka.Done
import akka.stream.scaladsl.Flow
import se.lu.nateko.cp.data.formats.{ColumnFormats, TableRow}
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.meta.core.data.TimeSeriesUploadCompletion

import scala.concurrent.{ExecutionContext, Future}

class SimpleSitesCsvRow(val header: Header, val cells: Array[String]) extends TableRow[Header]

object SimpleSitesCsvStreams {

	def simpleSitesCsvParser(implicit ctxt: ExecutionContext): Flow[String, SimpleSitesCsvRow, Future[Done]] = Flow.apply[String]
		.scan(seed)(parseLine)
		.exposeParsingError
		.keepGoodRows
		.map(acc => new SimpleSitesCsvRow(acc.header, acc.cells))

	def simpleSitesCsvToBinTableConverter(
		 nRows: Int,
		 formats: ColumnFormats,
	)(implicit ctxt: ExecutionContext): Flow[SimpleSitesCsvRow, BinTableRow, Future[TimeSeriesUploadCompletion]] = {
		timeSeriesToBinTableConverter(formats, header => new SimpleSitesCsvToBinTableConverter(formats, header, nRows))
	}
}
