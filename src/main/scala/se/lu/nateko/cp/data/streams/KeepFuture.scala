package se.lu.nateko.cp.data.streams

import scala.util.{Failure,Success}
import scala.concurrent.Future
import scala.concurrent.ExecutionContext
import scala.util.Try
import se.lu.nateko.cp.data.api.CpDataException

object KeepFuture {

	def right[L, R](implicit ctxt: ExecutionContext): (Future[L], Future[R]) => Future[R] =
		merge[L, R, R]((lTry, rTry) => lTry.flatMap(_ => rTry))

	def left[L, R](implicit ctxt: ExecutionContext): (Future[L], Future[R]) => Future[L] =
		merge[L, R, L]((lTry, rTry) => rTry.flatMap(_ => lTry))

	private def merge[L, R, O](tm: (Try[L], Try[R]) => Try[O])(implicit ctxt: ExecutionContext): (Future[L], Future[R]) => Future[O] =
		(lf, rf) => {
			lf.transformWith{lTry =>
				rf.transform{rTry =>
					(lTry, rTry) match{
						case (Failure(lErr), Failure(rErr)) => Failure(new CpDataException(lErr.getMessage + "\n" + rErr.getMessage))
						case _ => tm(lTry, rTry)
					}
				}
			}
		}
}
