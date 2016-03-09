package se.lu.nateko.cp.data.services.upload

import scala.concurrent.Future

import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.EmptyCompletionInfo

class MetaCompletionPostUploadTask(hash: Sha256Sum, client: MetaClient) extends PostUploadTask{

	import client.dispatcher

	def perform(taskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] = {

		val failures = taskResults.collect{
			case result: UploadTaskFailure => result
		}

		if(failures.isEmpty) {

			val completionInfo = taskResults.collectFirst{
				case IngestionSuccess(info) => info
			}.getOrElse(EmptyCompletionInfo)

			client.completeUpload(hash, completionInfo).map(UploadCompletionSuccess(_))

		} else
			Future.successful(CancelledBecauseOfOthers(failures))
	}

}