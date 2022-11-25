package se.lu.nateko.cp.data.streams

import scala.concurrent.Future
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Keep
import scala.concurrent.ExecutionContext
import akka.actor.ActorSystem
import akka.stream.Materializer

object PrefetchedSource:
	/**
		Pre-runs the Source to test that it does not crash early, by consuming only approximately <code>totalWeight</code> of elements as measured by the cost function <code>weight</code>
	**/
	def prefetchSource[T, M](inner: Source[T, M], totalWeight: Long)(weight: T => Long)(using mat: Materializer): Future[Source[T, M]] =
		import mat.executionContext
		val (m, queue) = inner.toMat(Sink.queue)(Keep.both).run()

		def prefetch(gotSoFar: List[T], weightSoFar: Long): Future[(List[T], Long)] =
			if weightSoFar >= totalWeight
			then Future.successful(gotSoFar -> weightSoFar)
			else queue.pull().flatMap{
				case None => Future.successful(gotSoFar -> weightSoFar)
				case Some(t) => prefetch(t :: gotSoFar, weightSoFar + weight(t))
			}

		prefetch(Nil, 0L).map{(prefetched, weight) =>
			val remaining =
				if weight < totalWeight then Source.empty
				else
					Source.unfoldAsync(queue) {queue =>
						queue.pull().map(_.map(queue -> _))
					}
			Source(prefetched.reverse).concat(remaining).watchTermination()(
				(_, done) => {
					done.onComplete{ case _ => queue.cancel() }
					m
				}
			)
		}
	end prefetchSource
