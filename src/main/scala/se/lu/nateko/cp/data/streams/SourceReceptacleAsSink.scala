package se.lu.nateko.cp.data.streams

import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.SourceQueueWithComplete
import scala.concurrent.Future
import scala.concurrent.Promise
import akka.stream.OverflowStrategy
import akka.Done
import scala.util.Failure
import scala.util.Success
import akka.stream.QueueOfferResult.{ Failure => QueueFailure, _ }
import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Keep

object SourceReceptacleAsSink {

	val ok = Future.successful(Done)

	def apply[T, M](receiver: Source[T, Any] => Future[M])(implicit exe: ExecutionContext): Sink[T, Future[M]] = {

		Sink.queue[T]().mapMaterializedValue{sinkQ =>
			val srcQueueProm = Promise[SourceQueueWithComplete[T]]()
			val src = Source.queue[T](1, OverflowStrategy.backpressure).mapMaterializedValue(srcQueueProm.success)
			val resFut = receiver(src)

			srcQueueProm.future.transformWith{
				case Failure(err) =>
					sinkQ.cancel()
					Future.failed(err)
				case Success(srcQ) =>
					val srcDone = srcQ.watchCompletion().andThen{case _ => sinkQ.cancel()}

					def pullFromSink(): Future[Done] = {
						sinkQ.pull().transformWith{
							case Failure(err) =>
								srcQ.fail(err)
								Future.failed(err)
							case Success(None) =>
								srcQ.complete()
								ok
							case Success(Some(bs)) =>
								srcQ.offer(bs).transformWith{
									case Failure(err) =>
										sinkQ.cancel()
										Future.failed(err)
									case Success(QueueFailure(err)) =>
										sinkQ.cancel()
										Future.failed(err)
									case Success(QueueClosed) =>
										sinkQ.cancel()
										ok
									case Success(Dropped) | Success(Enqueued) =>
										pullFromSink()
								}
						}
					}

					resFut.zipWith(pullFromSink().zip(srcDone))(Keep.left)
			}
		}
	}
}