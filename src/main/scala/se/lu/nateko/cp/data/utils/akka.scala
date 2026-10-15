package se.lu.nateko.cp.data.utils

import _root_.akka.Done
import _root_.akka.actor.Cancellable
import _root_.akka.actor.Scheduler
import _root_.akka.http.scaladsl.model.StatusCode
import _root_.akka.http.scaladsl.model.StatusCodes
import _root_.akka.http.scaladsl.server.Directives.complete
import _root_.akka.http.scaladsl.server.Directives.{extractRequest, extractRequestContext}
import _root_.akka.http.scaladsl.server.Route
import _root_.akka.stream.Materializer

import scala.collection.mutable
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.Promise
import scala.concurrent.duration.FiniteDuration

object akka:

	val done: Future[Done] = Future.successful(Done)

	class Debouncer[K, T](duration: FiniteDuration, scheduler: Scheduler)(using ExecutionContext):

		private val cancellations = mutable.Map.empty[K, Cancellable]
		private val promises = mutable.Map.empty[K, Promise[T]]
		private val inProgress = mutable.Map.empty[K, Future[T]]
		private val tickets = mutable.Map.empty[K, Object]
		private val queued = mutable.Map.empty[K, (Promise[T], () => Future[T])]

		private def start(key: K, res: Promise[T])(job: => Future[T]): Future[T] =
			promises.remove(key)
			cancellations.remove(key).foreach(_.cancel())
			tickets.remove(key)
			inProgress += key -> res.future
			val running = scala.util.Try(job).fold(Future.failed, identity)
			running.onComplete{result => synchronized{
				inProgress.remove(key)
				// Re-arm before completing, so that forced work waiting on this one supersedes the queued job.
				queued.remove(key).foreach{(queuedRes, queuedJob) =>
					queuedRes.completeWith(debounce(key)(queuedJob()))
				}
				res.complete(result)
			}}
			res.future

		/** Bypass the timer, superseding pending work but never overlapping a running job. */
		def runNow(key: K)(job: => Future[T]): Future[T] = synchronized{
			inProgress.get(key).fold{
				val res = promises.getOrElseUpdate(key, Promise[T]())
				start(key, res)(job)
			}{running =>
				running.transformWith(_ => runNow(key)(job))
			}
		}

		/** Delay the job, superseding pending work; work arriving during a running job is queued after it. */
		def debounce(key: K)(job: => Future[T]): Future[T] = synchronized{
			inProgress.get(key).fold{
				cancellations.get(key).foreach(_.cancel())

				val res = promises.getOrElseUpdate(key, Promise[T]())

				val ticket = new Object
				tickets += key -> ticket
				cancellations += key -> scheduler.scheduleOnce(duration){
					synchronized{
						// Cancellation alone cannot stop a callback already queued for execution.
						if tickets.get(key).contains(ticket) then start(key, res)(job)
					}
				}

				res.future
			}{_ =>
				val res = queued.get(key).fold(Promise[T]())(_._1)
				queued += key -> (res, () => job)
				res.future
			}
		}
	end Debouncer

	def gracefulPlainResponse(code: StatusCode, message: String): Route =
		extractRequestContext{reqCtxt =>
			import reqCtxt.materializer
			reqCtxt.request.discardEntityBytes()
			complete(code -> message)
		}

	def gracefulForbid(msg: String): Route = gracefulPlainResponse(StatusCodes.Forbidden, msg)
	def gracefulBadReq(msg: String): Route = gracefulPlainResponse(StatusCodes.BadRequest, msg)
	def gracefulUnauth(msg: String): Route = gracefulPlainResponse(StatusCodes.Unauthorized, msg)
