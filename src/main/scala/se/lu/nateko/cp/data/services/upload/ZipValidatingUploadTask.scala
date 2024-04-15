package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.streams.ZipValidator

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import ZipValidator.Result.*


class ZipValidatingUploadTask(using ExecutionContext) extends ValidatingUploadTask(ZipValidator):

	override def validateResult(result: ZipValidator.Result) = result match
		case Valid => DummySuccess
		case Invalid => failure("Not a ZIP file")
		case SpannedZip => failure("Rejecting upload because the file appears to be a part of a multi-zip archive")
		case NoData => failure("Empty file instead of a ZIP file")
		case EmptyZip => failure("Rejecting upload because the file is an empty ZIP")

end ZipValidatingUploadTask
