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
		val (m, prefetchFut) = inner.groupedWeighted(totalWeight)(weight).toMat(Sink.head)(Keep.both).run()
		prefetchFut.map{first =>
			val firstBatchWeight = first.map(weight).sum
			if firstBatchWeight < totalWeight
			then Source(first).mapMaterializedValue(_ => m)
			else inner
		}
