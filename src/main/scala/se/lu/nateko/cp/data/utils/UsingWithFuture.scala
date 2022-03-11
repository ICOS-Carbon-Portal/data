package se.lu.nateko.cp.data.utils

import java.io.Closeable
import scala.concurrent.Future
import scala.concurrent.ExecutionContext
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
