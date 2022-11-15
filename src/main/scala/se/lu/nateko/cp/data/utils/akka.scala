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
import se.lu.nateko.cp.data.api.CpDataException

import scala.collection.mutable
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.Promise
import scala.concurrent.duration.FiniteDuration

object akka:

	val done: Future[Done] = Future.successful(Done)

	class Debouncer[K, T](duration: FiniteDuration, scheduler: Scheduler, errorHint: String)(using ExecutionContext):

		private val cancellations = mutable.Map.empty[K, Cancellable]
		private val promises = mutable.Map.empty[K, Promise[T]]
		private val inProgress = mutable.Set.empty[K]

		def debounce(key: K)(job: => Future[T]): Future[T] = synchronized{
			if inProgress.contains(key) then
				Future.failed(CpDataException(s"$errorHint for $key is already ongoing"))
			else
				cancellations.get(key).foreach(_.cancel())

				val res = promises.getOrElseUpdate(key, Promise[T]())

				cancellations += key -> scheduler.scheduleOnce(duration){
					synchronized{
						promises.remove(key)
						cancellations.remove(key)
						val runningJob = job
						inProgress += key
						res.completeWith(runningJob)
					}
				}

				res.future.andThen{
					case _ => synchronized{inProgress.remove(key)}
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
