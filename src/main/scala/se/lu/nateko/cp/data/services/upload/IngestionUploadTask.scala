package se.lu.nateko.cp.data.services.upload

import java.io.File

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpMetaVocab
import se.lu.nateko.cp.meta.core.data.DataObject

class IngestionUploadTask(dataObj: DataObject, originalFile: File)(implicit ctxt: ExecutionContext) extends UploadTask{

	private val file = new File(originalFile, ".cpb")

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val format = dataObj.specification.format

		if(format.uri == CpMetaVocab.asciiWdcggTimeSer){
			//TODO Add WDCGG ingestion here
			???
		} else Sink.cancelled.mapMaterializedValue(_ =>
			Future.successful(
				NotImplementedFailure(s"Ingestion of format ${format.label} is not supported")
			)
		)
	}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) =
		UploadTask.revertOnAnyFailure(ownResult, otherTaskResults, () => Future{
			if(file.exists) file.delete()
			Done
		})

}