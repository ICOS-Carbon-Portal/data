//package se.lu.nateko.cp.data.formats.socat
//
//import scala.concurrent.ExecutionContext
//import scala.concurrent.Future
//import akka.Done
//import akka.stream.scaladsl.Flow
//import akka.stream.scaladsl.Keep
//import akka.stream.scaladsl.Sink
//import se.lu.nateko.cp.data.api.CpDataParsingException
//import se.lu.nateko.cp.data.formats._
//import se.lu.nateko.cp.data.formats.bintable.BinTableRow
//import se.lu.nateko.cp.data.streams.geo.GeoFeaturePointSink
//import se.lu.nateko.cp.data.streams.geo.Point
//import se.lu.nateko.cp.meta.core.data.GeoFeature
//import se.lu.nateko.cp.meta.core.data.SpatialTimeSeriesUploadCompletion
//
//class SocatRowHeader(val columnNames: Array[String]) extends TableRowHeader
//class SocatTsvRow(val header: SocatRowHeader, val cells: Array[String]) extends TableRow[SocatRowHeader]
//
//object SocatTsvStreams{
//
//	val LonColName = "Longitude"
//	val LatColName = "Latitude"
//
//	def socatTsvParser: Flow[String, SocatTsvRow, Future[Done]] = Flow[String]
//		.dropWhile(line => !line.contains("*/"))
//		.drop(1)
//		.map(_.trim.split('\t'))
//		.scan(new SocatTsvRow(new SocatRowHeader(Array.empty[String]), Array.empty[String])){(row, cells) =>
//			val header = if(row.header.columnNames.length == 0)
//				new SocatRowHeader(cells)
//			else row.header
//			new SocatTsvRow(header, cells)
//		}
//		.drop(2)
//		.alsoToMat(Sink.ignore)(Keep.right)
//
//
//	def socatTsvToBinTableConverter(
//		nRows: Int,
//		formats: ColumnsMetaWithTsCol
//	)(implicit ctxt: ExecutionContext): Flow[SocatTsvRow, BinTableRow, Future[SpatialTimeSeriesUploadCompletion]] = {
//
//		val binFlow = TimeSeriesStreams.timeSeriesToBinTableConverter(
//			formats,
//			(header: SocatRowHeader) => new SocatTsvToBinTableConverter(formats, header.columnNames, nRows)
//		)
//
//		binFlow.alsoToMat(coverageSink(formats)){(tsUplComplFut, coverageFut) =>
//			for(
//				tsUplCompl <- tsUplComplFut;
//				coverage <- coverageFut
//			) yield
//				SpatialTimeSeriesUploadCompletion(tsUplCompl.interval, coverage)
//		}
//	}
//
//	def coverageSink(formats: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext): Sink[BinTableRow, Future[GeoFeature]] = {
//		val sortedCols = formats.valueFormats.sortedColumns
//
//		val lonPos = sortedCols.indexOf(LonColName)
//		val latPos = sortedCols.indexOf(LatColName)
//
//		if(lonPos < 0 || latPos < 0)
//			Sink.cancelled.mapMaterializedValue(_ => Future.failed(
//				new CpDataParsingException("Expected both $LonColName and $LatColName columns to be present")
//			))
//		else Flow.apply[BinTableRow].map{row =>
//			val lon = row.cells(lonPos).asInstanceOf[Number].doubleValue
//			val lat = row.cells(latPos).asInstanceOf[Number].doubleValue
//			Point(lon, lat)
//		}.toMat(GeoFeaturePointSink.sink)(Keep.right)
//	}
//
//}
