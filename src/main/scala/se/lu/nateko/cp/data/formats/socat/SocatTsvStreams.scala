package se.lu.nateko.cp.data.formats.socat

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import se.lu.nateko.cp.data.formats.ColumnFormats
import se.lu.nateko.cp.data.formats.TableRow
import se.lu.nateko.cp.data.formats.TableRowHeader
import se.lu.nateko.cp.data.formats.TimeSeriesStreams
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.meta.core.data.TimeSeriesUploadCompletion

class SocatRowHeader(val columnNames: Array[String]) extends TableRowHeader
class SocatTsvRow(val header: SocatRowHeader, val cells: Array[String]) extends TableRow[SocatRowHeader]

object SocatTsvStreams{

	def socatTsvParser: Flow[String, SocatTsvRow, Future[Done]] = Flow[String]
		.dropWhile(line => !line.contains("*/"))
		.drop(1)
		.map(_.trim.split('\t'))
		.scan(new SocatTsvRow(new SocatRowHeader(Array.empty[String]), Array.empty[String])){(row, cells) =>
			val header = if(row.header.columnNames.length == 0)
				new SocatRowHeader(cells)
			else row.header
			new SocatTsvRow(header, cells)
		}
		.drop(2)
		.alsoToMat(Sink.ignore)(Keep.right)


	def socatTsvToBinTableConverter(
		nRows: Int,
		formatsFut: Future[ColumnFormats]
	)(implicit ctxt: ExecutionContext): Flow[SocatTsvRow, BinTableRow, Future[TimeSeriesUploadCompletion]] = {
		TimeSeriesStreams.timeSeriesToBinTableConverter(
			formatsFut,
			(header, formats) => new SocatTsvToBinTableConverter(formats, header.columnNames, nRows)
		)
	}

}
