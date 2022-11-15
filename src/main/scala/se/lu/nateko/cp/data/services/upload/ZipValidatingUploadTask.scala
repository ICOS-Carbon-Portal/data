package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.ZipValidator
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import ZipValidator.Result.*

class ZipValidatingUploadTask(using ExecutionContext) extends UploadTask{

	def sink: Sink[ByteString, Future[UploadTaskResult]] = ZipValidator
		.assertZipFormat.mapMaterializedValue{
			_.map{
				case Valid => DummySuccess
				case Invalid => zipFailure("Not a ZIP file")
				case SpannedZip => zipFailure("Rejecting upload because the file appears to be a part of a multi-zip archive")
				case NoData => zipFailure("Empty file instead of a ZIP file")
				case EmptyZip => zipFailure("Rejecting upload because the file is an empty ZIP")
			}
		}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = Future.successful(ownResult)

	def zipFailure(msg: String) = IngestionFailure(CpDataParsingException(msg))
}
