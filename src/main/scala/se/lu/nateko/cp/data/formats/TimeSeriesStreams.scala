package se.lu.nateko.cp.data.formats

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Flow
import scala.concurrent.Future
import akka.Done
import akka.NotUsed
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Broadcast
import akka.stream.FlowShape

object TimeSeriesStreams {

	def errorCapturingParser[A <: ParsingAccumulator](parser: Flow[String, A, NotUsed])(implicit ctxt: ExecutionContext): Flow[String, A, Future[Done]] = {

		val errorExtractor: Sink[A, Future[Done]] = Flow[A]
			.filter(_.error.isDefined)
			.mapConcat[Throwable](_.error.toList)
			.toMat(Sink.headOption){(_, errOptFut) =>
				errOptFut.flatMap{
					case Some(err) => Future.failed(err)
					case _ => Future.successful(Done)
				}
			}

		val graph = GraphDSL.create(errorExtractor){implicit b => errorSink =>
			import GraphDSL.Implicits._
			val stringToAcc = b.add(parser)
			val accCloner = b.add(Broadcast[A](2))
			stringToAcc.out ~> accCloner.in

			val accFilter = b.add(Flow[A].filter(acc => acc.isOnData && acc.error.isEmpty))
			accCloner.out(0) ~> accFilter.in
			accCloner.out(1) ~> errorSink.in
			FlowShape(stringToAcc.in, accFilter.out)
		}

		Flow.fromGraph(graph)
	}
}