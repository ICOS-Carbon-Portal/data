package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.concurrent.ExecutionContext

object Utils {

	def waitForAll(futures: TraversableOnce[Future[Any]])(implicit exec: ExecutionContext): Future[Unit] = {
		val safeFutures: TraversableOnce[Future[Any]] = futures.map(_.recover{case _ => null})
		Future.sequence(safeFutures).map(_ => ())
	}

	def waitForAll(futures: Future[Any]*)(implicit exec: ExecutionContext): Future[Unit] = waitForAll(futures)
}