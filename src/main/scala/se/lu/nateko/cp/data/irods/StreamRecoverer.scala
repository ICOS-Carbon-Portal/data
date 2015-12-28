package se.lu.nateko.cp.data.irods

import scala.concurrent.Future
import scala.concurrent.Promise
import scala.util.Failure
import scala.util.Success

import akka.stream.Attributes
import akka.stream.FlowShape
import akka.stream.Inlet
import akka.stream.Outlet
import akka.stream.scaladsl.Flow
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.GraphStageWithMaterializedValue
import akka.stream.stage.InHandler
import akka.stream.stage.OutHandler

object StreamRecoverer{

	def apply[T](): Flow[T, T, Future[Unit]] = Flow.fromGraph(new StreamRecoverer[T])

}

private class StreamRecoverer[T] extends GraphStageWithMaterializedValue[FlowShape[T, T], Future[Unit]]{

	private[this] val in: Inlet[T] = Inlet("RecoveredStreamInput")
	private[this] val out: Outlet[T] = Outlet("RecoveredStreamOutput")

	override val shape = FlowShape(in, out)

	override def createLogicAndMaterializedValue(inheritedAttributes: Attributes): (GraphStageLogic, Future[Unit]) = {

		val logic = new GraphStageLogic(shape){

			val matValPromise = Promise[Unit]()

			setHandler(in, new InHandler{
				override def onPush(): Unit = push(out, grab(in))

				override def onUpstreamFailure(ex: Throwable): Unit = {
					completeStage()
					matValPromise.complete(Failure(ex))
				}

				override def onUpstreamFinish(): Unit = {
					super.onUpstreamFinish()
					matValPromise.complete(Success(()))
				}
			})

			setHandler(out, new OutHandler {
				override def onPull(): Unit = pull(in)
			})
		}

		(logic, logic.matValPromise.future)
	}
}
