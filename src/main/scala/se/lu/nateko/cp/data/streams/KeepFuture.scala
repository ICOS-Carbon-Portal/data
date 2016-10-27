package se.lu.nateko.cp.data.streams

import scala.concurrent.Future
import scala.concurrent.ExecutionContext

object KeepFuture {

	def right[L, R](implicit ctxt: ExecutionContext): (Future[L], Future[R]) => Future[R] =
		(lf, rf) => for(_ <- lf; r <- rf) yield r

	def left[L, R](implicit ctxt: ExecutionContext): (Future[L], Future[R]) => Future[L] =
		(lf, rf) => for(_ <- rf; l <- lf) yield l
}