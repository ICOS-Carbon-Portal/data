package se.lu.nateko.cp.data.services.upload

import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.UploadCompletionInfo
import se.lu.nateko.cp.data.api.CpDataException

class UploadResult(val taskResults: Seq[UploadTaskResult]){

	//TODO Provide a proper reporting mechanism
	def makeReport: String = {
		val failures = taskResults.collect{
			case result: UploadTaskFailure => result
		}

		if(failures.isEmpty) {

			taskResults.collectFirst{
				case UploadCompletionSuccess(info) => info
			}.getOrElse("NOT SPECIFIED")

		} else
			failures.head.error.getMessage
	}

}

sealed trait UploadTaskResult

sealed trait UploadTaskSuccess extends UploadTaskResult
sealed trait UploadTaskCancellation extends UploadTaskResult
sealed trait UploadTaskFailure extends UploadTaskResult{
	val error: Throwable
}
case class NotImplementedFailure(message: String) extends UploadTaskFailure{
	val error = new CpDataException(message)
}
case class CancelledBecauseOfOthers(errors: Seq[UploadTaskFailure]) extends UploadTaskCancellation

case class HashsumCheckSuccess(actual: Sha256Sum) extends UploadTaskSuccess
case class HashsumCheckFailure(expected: Sha256Sum, actual: Sha256Sum) extends UploadTaskFailure{
	val error = new CpDataException(s"Expected ${expected.id}, got ${actual.id}")
}

case class IrodsSuccess(hash: Sha256Sum) extends UploadTaskSuccess
case class IrodsFailure(error: Throwable) extends UploadTaskFailure

case class FileWriteSuccess(bytesWritten: Long) extends UploadTaskSuccess
case class FileWriteFailure(error: Throwable) extends UploadTaskFailure
case object FileExists extends UploadTaskCancellation

case class IngestionSuccess(completionInfo: UploadCompletionInfo) extends UploadTaskSuccess
case class UploadCompletionSuccess(response: String) extends UploadTaskSuccess
