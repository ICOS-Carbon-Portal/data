package se.lu.nateko.cp.data.utils

import se.lu.nateko.cp.data.api.CpDataException

import java.io.Closeable
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Try

def usingWithFuture[T <: Closeable,O](maker: => T)(user: T => Future[O])(using ExecutionContext): Future[O] = {
	Future.fromTry(Try(maker)).flatMap{t =>
		try{
			user(t).andThen{case _ => t.close()}
		}catch{
			case err =>
				t.close()
				Future.failed(err)
		}
	}
}

extension[T](fut: Future[T])
	def contextualizeFailure(contextMessage: String)(using ExecutionContext): Future[T] = fut.transform(
		identity,
		err => CpDataException(s"$contextMessage: ${err.getMessage}")
	)
