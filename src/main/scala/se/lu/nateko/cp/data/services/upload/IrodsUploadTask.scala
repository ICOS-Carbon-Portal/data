package se.lu.nateko.cp.data.services.upload

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.irods.IrodsClient
import se.lu.nateko.cp.meta.core.data.DataObject

class IrodsUploadTask(dataObject: DataObject, client: IrodsClient)(implicit ctxt: ExecutionContext) extends UploadTask{

	private[this] val filePath: String = UploadService.filePathSuffix(dataObject)

	client.ensureFolderExists(UploadService.fileFolder(dataObject))

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val optimistic = if(client.fileExists(filePath)) {

			client.getNewFileSink(filePath).mapMaterializedValue(_.map(IrodsSuccess(_)))

		} else Sink.cancelled.mapMaterializedValue(
			_ => Future{
				IrodsSuccess(client.getChecksum(filePath))
			}
		)
		optimistic.mapMaterializedValue(
			_.map{success =>
				if(success.hash == dataObject.hash) success
				else IrodsHashsumFailure(HashsumCheckFailure(dataObject.hash, success.hash))
			}.recover{
				case err => IrodsFailure(err)
			}
		)
	}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] =
		UploadTask.revertOnOwnFailure(ownResult, () => Future{
			client.deleteFile(filePath)
			Done
		})

}