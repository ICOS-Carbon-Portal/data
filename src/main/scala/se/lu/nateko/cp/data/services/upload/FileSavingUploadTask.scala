package se.lu.nateko.cp.data.services.upload

import java.io.File

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.Done
import akka.stream.IOResult
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpDataException
import java.nio.file.Paths
import java.nio.file.Files
import java.nio.file.StandardCopyOption

class FileSavingUploadTask(file: File)(implicit ctxt: ExecutionContext) extends UploadTask{

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		if(file.exists)
			Sink.cancelled.mapMaterializedValue(_ => Future.successful(FileExists))
		else {
			val folder = file.getParentFile
			if(folder != null && !folder.exists) folder.mkdir()
			FileIO.toPath(file.toPath).mapMaterializedValue(_.map(ioResultToTaskResult))
		}
	}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] = {
		ownResult match {
			case FileExists => Future.successful(FileExists)
			case _ =>
				val relevantOtherErrors: Seq[UploadTaskFailure] = otherTaskResults.collect{
					case failure: HashsumCheckFailure => Some(failure)
					case failure: UnexpectedTaskFailure => Some(failure)
					case failure: ByteCountingFailure => Some(failure)

					case ByteCountingSuccess(bytes) =>
						ownResult match{
							case FileWriteSuccess(actualBytes) =>
								if(bytes == actualBytes) None else {
									val msg = s"Got $bytes bytes but written to disk only $actualBytes"
									Some(ByteCountingFailure(new CpDataException(msg)))
								}
							case _ => None
						}
				}.flatten

				UploadTask.revertOnAnyFailure(ownResult, relevantOtherErrors, () => Future{
					if(file.exists) {
						val newPath = Paths.get(file.getAbsolutePath + "_failed")
						Files.move(file.toPath, newPath, StandardCopyOption.REPLACE_EXISTING)
					}
					Done
				})
		}
	}

	private def ioResultToTaskResult(ioRes: IOResult): UploadTaskResult = ioRes.status match{
		case Success(_) => FileWriteSuccess(ioRes.count)
		case Failure(err) => FileWriteFailure(err)
	}

}
