package se.lu.nateko.cp.data.services.upload

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.data.api.B2StageClient
import se.lu.nateko.cp.data.api.CpDataException

class B2StageUploadTask private (dataObject: DataObject, client: B2StageClient)(implicit ctxt: ExecutionContext) extends UploadTask{

	private[this] val filePath: String = "/" + UploadService.filePathSuffix(dataObject)

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val sinkFut = client.exists(filePath).map{
			case true => Sink.cancelled.mapMaterializedValue(
					_ => Future.successful(B2StageSuccess)
				)
			case false =>
				client.objectSink(filePath).mapMaterializedValue(
					_.map(_ => B2StageSuccess)
				)
		}

		Sink.lazyInitAsync(() => sinkFut).mapMaterializedValue(_
			.flatMap{
				case None => Future.failed(new CpDataException("No data came through"))
				case Some(inner) => inner
			}
			.recover{
				case err => B2StageFailure(err)
			}
		)
	}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] =
		UploadTask.revertOnOwnFailure(ownResult, () => client.delete(filePath))

}

object B2StageUploadTask{

	def apply(dataObject: DataObject, client: B2StageClient)(implicit ctxt: ExecutionContext): Future[B2StageUploadTask] = {

		val folderPath: String = "/" + UploadService.fileFolder(dataObject)

		client.exists(folderPath).flatMap{
			case true => Future.successful(Done)
			case false => client.createCollection(folderPath)
		}.map(_ => new B2StageUploadTask(dataObject, client))
	}
}
