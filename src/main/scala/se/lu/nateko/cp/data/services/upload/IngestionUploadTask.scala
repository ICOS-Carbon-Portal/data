package se.lu.nateko.cp.data.services.upload

import java.io.File
import java.nio.file.Paths

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.meta.core.data.DataObject

class IngestionUploadTask(dataObj: DataObject, folder: File)(implicit ctxt: ExecutionContext) extends UploadTask{

	private val file = Paths.get(folder.getAbsolutePath, dataObj.hash.id + ".cpb").toFile

	def sink: Sink[ByteString, Future[UploadTaskResult]] = ???

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) =
		UploadTask.revertOnAnyFailure(ownResult, otherTaskResults, () => Future{
			if(file.exists) file.delete()
			Done
		})

}