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
import se.lu.nateko.cp.meta.core.data.SpatialTimeSeriesUploadCompletion
import se.lu.nateko.cp.meta.core.data.TimeSeriesUploadCompletion
import se.lu.nateko.cp.meta.core.data.SpatialCoverage
import se.lu.nateko.cp.meta.core.data.GeoTrack
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.streams.geo.PointReducerState
import se.lu.nateko.cp.data.streams.geo.PointReducer

class SocatRowHeader(val columnNames: Array[String]) extends TableRowHeader
class SocatTsvRow(val header: SocatRowHeader, val cells: Array[String]) extends TableRow[SocatRowHeader]

object SocatTsvStreams{

	val LonColName = "Longitude"
	val LatColName = "Latitude"

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
		formats: ColumnFormats
	)(implicit ctxt: ExecutionContext): Flow[SocatTsvRow, BinTableRow, Future[SpatialTimeSeriesUploadCompletion]] = {

		val binFlow = TimeSeriesStreams.timeSeriesToBinTableConverter(
			formats,
			(header: SocatRowHeader) => new SocatTsvToBinTableConverter(formats, header.columnNames, nRows)
		)

		binFlow.alsoToMat(coverageSink(formats)){(tsUplComplFut, coverageFut) =>
			for(
				tsUplCompl <- tsUplComplFut;
				coverage <- coverageFut
			) yield
				SpatialTimeSeriesUploadCompletion(tsUplCompl.interval, coverage)
		}
	}

	def coverageSink(formats: ColumnFormats)(implicit ctxt: ExecutionContext): Sink[BinTableRow, Future[Either[SpatialCoverage, GeoTrack]]] = {
		val sortedCols = formats.sortedColumns

		val lonPos = sortedCols.indexOf(LonColName)
		val latPos = sortedCols.indexOf(LatColName)

		if(lonPos < 0 || latPos < 0) return Sink.cancelled.mapMaterializedValue(_ => Future.failed(
			new CpDataParsingException("Expected both $LonColName and $LatColName columns to be present")
		))

		val seed = new PointReducerState
		val reducer = PointReducer.signedTriangleAreaCost(20)

		val reducingSink: Sink[BinTableRow, Future[PointReducerState]] = Flow.apply[BinTableRow].fold(seed){(s, row) =>
			val lon = row.cells(lonPos).asInstanceOf[Number].floatValue
			val lat = row.cells(latPos).asInstanceOf[Number].floatValue
			reducer.nextState(s, lat, lon)
		}.toMat(Sink.head[PointReducerState])(Keep.right)

		reducingSink.mapMaterializedValue(_.map(PointReducer.getCoverage))
	}

}
