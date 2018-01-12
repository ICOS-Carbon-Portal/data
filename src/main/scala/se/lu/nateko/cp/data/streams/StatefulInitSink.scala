package se.lu.nateko.cp.data.streams

import scala.concurrent.Future
import scala.concurrent.Promise

import akka.stream.Attributes
import akka.stream.Inlet
import akka.stream.SinkShape
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.GraphStageWithMaterializedValue
import akka.stream.stage.InHandler
import akka.stream.stage.OutHandler

object StatefulInitSink {
	def apply[T, M](sinkFactory: () => Sink[T, M]): Sink[T, Future[M]] = Sink.fromGraph(new StatefulInitSink(sinkFactory))
}

private class StatefulInitSink[T, M](sinkFactory: () => Sink[T, M]) extends GraphStageWithMaterializedValue[SinkShape[T], Future[M]]{

	val in = Inlet[T]("StatefulInitSink.in")
	override val shape: SinkShape[T] = SinkShape.of(in)

	override def createLogicAndMaterializedValue(inheritedAttributes: Attributes): (GraphStageLogic, Future[M]) = {
		val theSink = sinkFactory().withAttributes(inheritedAttributes)

		val promise = Promise.apply[M]

		val logic = new GraphStageLogic(shape) with InHandler {

			private var sourceOut: SubSourceOutlet[T] = _

			override def preStart(): Unit = {
				sourceOut = new SubSourceOutlet[T]("StatefulInitSink")
				sourceOut.setHandler(new OutHandler {
					override def onPull(): Unit = pull(in)
					override def onDownstreamFinish(): Unit = {
						sourceOut.complete()
						completeStage()
					}
				})
				promise.success(Source.fromGraph(sourceOut.source).runWith(theSink)(materializer))
			}

			override def onPush(): Unit = {
				sourceOut.push(grab(in))
			}

			override def onUpstreamFinish(): Unit = {
				sourceOut.complete()
				completeStage()
			}

			override def onUpstreamFailure(ex: Throwable): Unit = {
				sourceOut.fail(ex)
				failStage(ex)
			}

			setHandler(in, this)
		}

		(logic, promise.future)
	}

}
