package se.lu.nateko.cp.data.formats.ecocsv

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import EcoCsvParser._
import akka.Done
import akka.stream.scaladsl.Flow
import se.lu.nateko.cp.data.formats.ColumnFormats
import se.lu.nateko.cp.data.formats.TableRow
import se.lu.nateko.cp.data.formats.TimeSeriesStreams._
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.meta.core.data.TimeSeriesUploadCompletion
import akka.NotUsed

class EcoCsvRow(val header: Header, val cells: Array[String]) extends TableRow[Header]

object EcoCsvStreams{

	def ecoCsvParser(implicit ctxt: ExecutionContext): Flow[String, EcoCsvRow, Future[Done]] = Flow.apply[String]
		.scan(seed)(parseLine)
		.exposeParsingError
		.keepGoodRows
		.map(acc => new EcoCsvRow(acc.header, acc.cells))


	def ecoCsvToBinTableConverter(
		nRows: Int,
		formats: ColumnFormats
	)(implicit ctxt: ExecutionContext): Flow[EcoCsvRow, BinTableRow, Future[TimeSeriesUploadCompletion]] = {
		timeSeriesToBinTableConverter(
			formats,
			header => new EcoCsvToBinTableConverter(formats, header, nRows)
		)
	}

}
