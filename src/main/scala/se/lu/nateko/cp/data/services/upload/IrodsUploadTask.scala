package se.lu.nateko.cp.data.services.upload

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.irods.IrodsClient

class IrodsUploadTask(filePath: String, client: IrodsClient)(implicit ctxt: ExecutionContext) extends UploadTask{

	def sink: Sink[ByteString, Future[UploadTaskResult]] = client.getNewFileSink(filePath)
		.mapMaterializedValue(
			_.map(IrodsSuccess(_)).recover{
				case err => IrodsFailure(err)
			}
		)

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] =
		UploadTask.revertOnAnyFailure(ownResult, otherTaskResults, () => Future{
			client.deleteFile(filePath)
			Done
		}).map(result => {

			val hashOpt = otherTaskResults.collectFirst{
				case HashsumCheckSuccess(hash) => hash
			}

			(result, hashOpt) match{
				case (IrodsSuccess(actualHash), Some(hash)) =>
					if(hash == actualHash) result
					else {
						client.deleteFile(filePath)
						HashsumCheckFailure(hash, actualHash)
					}
				case _ => result
			}
		})

}