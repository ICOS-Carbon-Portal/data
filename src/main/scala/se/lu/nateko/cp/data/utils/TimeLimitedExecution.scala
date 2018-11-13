package se.lu.nateko.cp.data.utils

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.Await
import java.util.concurrent.TimeoutException

object TimeLimitedExecution {

	def apply[T](limit: FiniteDuration, timeoutExc: => Exception)(body: => T)(implicit ec: ExecutionContext): T = {
		val (inner, cancel) = InterruptibleCancellableFuture.interruptibly(body)
		try{
			Await.result(inner, limit)
		}catch{
			case _: TimeoutException =>
				cancel()
				throw timeoutExc
		}
	}
}
