package se.lu.nateko.cp.data.services.upload

import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.data.formats.bintable.FileExtension
import se.lu.nateko.cp.data.formats.netcdf.ObspackNcToBinTable
import se.lu.nateko.cp.data.utils.io.withSuffix

import java.nio.file.Path
import java.util.concurrent.Executors
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import UploadTask.FUTR
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.data.formats.bintable.BinTableSink.apply

class ObspackNetCdfIngestionTask(
	origFile: Path, colsMeta: ColumnsMeta, tryIngest: Boolean
)(using mat: Materializer) extends UploadTask:
	import mat.executionContext

	def sink: Sink[ByteString, FUTR] =
		if tryIngest //need to save to the file, as no FileSavingUploadTask is being run in parallel
		then FileIO.toPath(origFile).mapMaterializedValue(_.map(ioRes => FileWriteSuccess(ioRes.count)))
		else Sink.cancelled.mapMaterializedValue(_ => Future.successful(DummySuccess))

	def onComplete(own: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): FUTR =
		failIfOthersFailed(otherTaskResults){
			val parser = ObspackNcToBinTable(origFile, colsMeta)
			val file = origFile.withSuffix(FileExtension)
			val tmpFile = file.withSuffix(".working")
			Source
				.apply(parser.readRows())
				.runWith(BinTableSink(tmpFile.toFile, true))
				.map{
					
				}
			???
		}
