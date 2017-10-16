package se.lu.nateko.cp.data.services.upload

import scala.concurrent.Future
import se.lu.nateko.cp.data.api.{CpDataException, MetaClient}
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.{IngestionMetadataExtract, UploadCompletionInfo}

class MetaCompletionPostUploadTask(hash: Sha256Sum, client: MetaClient) extends PostUploadTask{

	import client.dispatcher

	def perform(taskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] = {

		val failures = taskResults.collect{
			case result: UploadTaskFailure => result
		}

		if(failures.isEmpty) {

			val bytesFut: Future[Long] = taskResults.collectFirst{
				case ByteCountingSuccess(bytes) =>
					Future.successful(bytes)
			}.getOrElse(
					Future.failed(
						new CpDataException("Result of the byte-counting upload task was not found")
					)
			)

			val extractOpt: Option[IngestionMetadataExtract] = taskResults.collectFirst{
				case IngestionSuccess(extract) => extract
			}

			for(
				bytes <- bytesFut;
				completionInfo = UploadCompletionInfo(bytes, extractOpt);
				metaServiceResponse <- client.completeUpload(hash, completionInfo)
			) yield UploadCompletionSuccess(metaServiceResponse)

		} else
			Future.successful(CancelledBecauseOfOthers(failures))
	}

}
