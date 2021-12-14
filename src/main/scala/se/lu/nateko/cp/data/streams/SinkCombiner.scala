package se.lu.nateko.cp.data.streams

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.SinkShape
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Sink

object SinkCombiner {

	private val EagerCancel = false

	/**
	 * Combines multiple sinks with compatible inputs and materialization values into a single sink by broadcasting.
	 * The resulting sink's materialization value is a sequence of the underlying sinks' materialization values.
	 * The resulting sink does not cancel if only some (not all) of the underlying sinks cancel.
	 */
	def combineMat[In, Mat](sinks: Seq[Sink[In, Mat]]): Sink[In, Seq[Mat]] = sinks match {

		case Nil =>
			Sink.cancelled.mapMaterializedValue(_ => Nil)

		case Seq(sink) =>
			sink.mapMaterializedValue(Seq(_))

		case Seq(first, second) => Sink.fromGraph(
			GraphDSL.createGraph(first, second)(Seq(_, _)){ implicit b =>
				import GraphDSL.Implicits._
				val bcast = b.add(Broadcast[In](2, EagerCancel))
				(sink1, sink2) => {
					bcast.out(0) ~> sink1.in
					bcast.out(1) ~> sink2.in
					SinkShape(bcast.in)
				}
			}
		)

		case Seq(first, second, third) => Sink.fromGraph(
			GraphDSL.createGraph(first, second, third)(Seq(_, _, _)){ implicit b =>
				import GraphDSL.Implicits._
				val bcast = b.add(Broadcast[In](3, EagerCancel))
				(sink1, sink2, sink3) => {
					bcast.out(0) ~> sink1.in
					bcast.out(1) ~> sink2.in
					bcast.out(2) ~> sink3.in
					SinkShape(bcast.in)
				}
			}
		)

		case Seq(first, second, third, fourth) => Sink.fromGraph(
			GraphDSL.createGraph(first, second, third, fourth)(Seq(_, _, _, _)){ implicit b =>
				import GraphDSL.Implicits._
				val bcast = b.add(Broadcast[In](4, EagerCancel))
				(sink1, sink2, sink3, sink4) => {
					bcast.out(0) ~> sink1.in
					bcast.out(1) ~> sink2.in
					bcast.out(2) ~> sink3.in
					bcast.out(3) ~> sink4.in
					SinkShape(bcast.in)
				}
			}
		)

		case _ =>
			val half = sinks.size / 2
			val firstHalf = combineMat(sinks.take(half))
			val secondHalf = combineMat(sinks.drop(half))
			Sink.fromGraph(
				GraphDSL.createGraph(firstHalf, secondHalf)(_ ++ _){ implicit b =>
					import GraphDSL.Implicits._
					val bcast = b.add(Broadcast[In](2, EagerCancel))
					(sink1, sink2) => {
						bcast.out(0) ~> sink1.in
						bcast.out(1) ~> sink2.in
						SinkShape(bcast.in)
					}
				}
			)
	}

	def ignoreOnCancel[T,M](sink: Sink[T, Future[M]])(implicit ctxt: ExecutionContext): Sink[T, Future[M]] =
		//The following shorter implementation does not work because wireTap drops elements
		//(and 'alsoTo'-based solution does not work because 'alsoTo' cancels eagerly)
		//Flow.apply[T].wireTapMat(sink)(Keep.right).toMat(Sink.ignore)(KeepFuture.left)
		Sink.fromGraph(GraphDSL.createGraph(sink, Sink.ignore)(KeepFuture.left){implicit b =>
			import GraphDSL.Implicits._
			val bcast = b.add(Broadcast[T](2, false))
			(sink1, sink2) => {
				bcast.out(0) ~> sink1.in
				bcast.out(1) ~> sink2.in
				SinkShape(bcast.in)
			}
		})

}
