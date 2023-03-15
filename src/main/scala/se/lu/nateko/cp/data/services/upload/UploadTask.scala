package se.lu.nateko.cp.data.services.upload

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.util.ByteString

import UploadTask.FUTR

trait UploadTask:

	def sink: Sink[ByteString, FUTR]

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): FUTR

	protected def failIfOthersFailed(otherTaskResults: Seq[UploadTaskResult])(orElse: => FUTR): FUTR =
		val failures = otherTaskResults.collect{
			case fail: UploadTaskFailure => fail
		}
		if !failures.isEmpty then
			Future.successful(CancelledBecauseOfOthers(failures))
		else orElse


trait PostUploadTask:
	def perform(taskResults: Seq[UploadTaskResult]): FUTR


object UploadTask{

	type FUTR = Future[UploadTaskResult]

	def revertOnOwnFailure(ownResult: UploadTaskResult, cleanup: () => Future[Done])(using ExecutionContext): FUTR =
		ownResult match
			case _: UploadTaskFailure => cleanup().map(_ => ownResult)
			case _ => Future.successful(ownResult)

	def revertOnAnyFailure(
		ownResult: UploadTaskResult,
		otherTaskResults: Seq[UploadTaskResult],
		cleanup: () => Future[Done]
	)(using ExecutionContext): FUTR = ownResult match {

		case _: UploadTaskFailure => cleanup().map(_ => ownResult)

		case _ =>
			val failures = otherTaskResults.collect{
				case result: UploadTaskFailure => result
			}
			if(failures.isEmpty) Future.successful(ownResult)
			else cleanup().map(_ => CancelledBecauseOfOthers(failures))
	}

}

class NoopTask(result: UploadTaskResult) extends UploadTask:
	override def sink = Sink.cancelled.mapMaterializedValue(_ => Future.successful(result))
	override def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = Future.successful(ownResult)

class NotSupportedUploadTask(message: String) extends NoopTask(NotImplementedFailure(message))
object DummyNoopTask extends NoopTask(DummySuccess)
