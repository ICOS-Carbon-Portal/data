package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.Sink
import akka.util.ByteString

import scala.concurrent.{ExecutionContext, Future}

class ByteCountingTask(implicit ctxt: ExecutionContext) extends UploadTask {

  def sink: Sink[ByteString, Future[UploadTaskResult]] = {
    Sink
      .fold[Long, ByteString](0L)((acc, bs) => acc + bs.length)
      .mapMaterializedValue(
        bytesFuture => bytesFuture
          .map(bytes => ByteCountingSuccess(bytes))
            .recover{
              case err: Throwable => ByteCountingFailure(err)
            }

      )
  }

  def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = Future.successful(ownResult)

}
