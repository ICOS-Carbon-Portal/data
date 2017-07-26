package se.lu.nateko.cp.data.services.upload

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

class HashsumCheckingUploadTask(hash: Sha256Sum)(implicit ctxt: ExecutionContext) extends UploadTask{

	def sink: Sink[ByteString, Future[UploadTaskResult]] = DigestFlow.sha256.to(Sink.ignore)
		.mapMaterializedValue(_.map(actualHash => {
			if(actualHash == hash)
				HashsumCheckSuccess(actualHash)
			else HashsumCheckFailure(hash, actualHash)
		}).recover{
			case _ =>
				val zeroHash = Sha256Sum.fromHex("0" * 64).get
				HashsumCheckFailure(hash, zeroHash)
		})

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = Future.successful(ownResult)

}