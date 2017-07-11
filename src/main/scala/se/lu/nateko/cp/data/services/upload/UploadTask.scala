package se.lu.nateko.cp.data.services.upload

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.util.ByteString

trait UploadTask{

	def sink: Sink[ByteString, Future[UploadTaskResult]]

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult]

}

trait PostUploadTask{

	def perform(taskResults: Seq[UploadTaskResult]): Future[UploadTaskResult]

}


object UploadTask{

	def revertOnOwnFailure(
		ownResult: UploadTaskResult, cleanup: () => Future[Done]
	)
	(implicit ctxt: ExecutionContext): Future[UploadTaskResult] = ownResult match {

		case _: UploadTaskFailure => cleanup().map(_ => ownResult)

		case _ =>
			Future.successful(ownResult)
	}

	def revertOnAnyFailure(
		ownResult: UploadTaskResult,
		otherTaskResults: Seq[UploadTaskResult],
		cleanup: () => Future[Done]
	)
	(implicit ctxt: ExecutionContext): Future[UploadTaskResult] = ownResult match {

		case _: UploadTaskFailure => cleanup().map(_ => ownResult)

		case _ =>
			val failures = otherTaskResults.collect{
				case result: UploadTaskFailure => result
			}
			if(failures.isEmpty) Future.successful(ownResult)
			else cleanup().map(_ => CancelledBecauseOfOthers(failures))
	}

}

class NotSupportedUploadTask(message: String) extends UploadTask{
	override def sink = Sink.cancelled.mapMaterializedValue(_ => Future.successful(NotImplementedFailure(message)))
	override def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = Future.successful(ownResult)
}
