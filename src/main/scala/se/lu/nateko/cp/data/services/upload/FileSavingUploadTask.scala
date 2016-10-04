package se.lu.nateko.cp.data.services.upload

import java.io.File
import java.nio.file.Paths

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.Done
import akka.stream.IOResult
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

class FileSavingUploadTask(file: File)(implicit ctxt: ExecutionContext) extends UploadTask{

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		if(file.exists)
			Sink.cancelled.mapMaterializedValue(_ => Future.successful(FileExists))
		else FileIO.toPath(file.toPath).mapMaterializedValue(_.map(ioResultToTaskResult))
	}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] = {
		ownResult match {
			case FileExists => Future.successful(FileExists)
			case _ =>
				UploadTask.revertOnAnyFailure(ownResult, otherTaskResults, () => Future{
					if(file.exists) file.delete()
					Done
				})
		}
	}

	private def ioResultToTaskResult(ioRes: IOResult): UploadTaskResult = ioRes.status match{
		case Success(_) => FileWriteSuccess(ioRes.count)
		case Failure(err) => FileWriteFailure(err)
	}

}