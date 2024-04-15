package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpDataParsingException

import scala.concurrent.Future
import se.lu.nateko.cp.data.streams.FileFormatValidator
import scala.concurrent.ExecutionContext


abstract class ValidatingUploadTask[T](using ExecutionContext) extends UploadTask:

	def validator: FileFormatValidator[T]

	def validateResult(result: T): UploadTaskResult
	def sink: Sink[ByteString, Future[UploadTaskResult]] = validator.assertFormat.mapMaterializedValue(_.map(validateResult))

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = Future.successful(ownResult)

	def failure(msg: String) = IngestionFailure(CpDataParsingException(msg))

end ValidatingUploadTask
