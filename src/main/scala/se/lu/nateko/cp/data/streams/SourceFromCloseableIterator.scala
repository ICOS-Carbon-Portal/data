package se.lu.nateko.cp.data.streams

import scala.concurrent.Future
import scala.concurrent.Promise

import akka.stream.Attributes
import akka.stream.Outlet
import akka.stream.SourceShape
import akka.stream.scaladsl.Source
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.GraphStageWithMaterializedValue
import akka.stream.stage.OutHandler
import akka.Done

object SourceFromCloseableIterator {

	def apply[T](iterFactory: () => (Iterator[T], () => Unit)): Source[T, Future[Done]] =
		Source.fromGraph(new SourceFromCloseableIterator(iterFactory))
}

private class SourceFromCloseableIterator[T](iterFactory: () => (Iterator[T], () => Unit))
								extends GraphStageWithMaterializedValue[SourceShape[T], Future[Done]]{

	private val out: Outlet[T] = Outlet("BinTableColumnBinaryOutput")

	override val shape = SourceShape(out)

	override def createLogicAndMaterializedValue(inheritedAttributes: Attributes): (GraphStageLogic, Future[Done]) = {

		val donePromise = Promise[Done]()

		val logic = new GraphStageLogic(shape){

			private[this] var iterClosed = false
			private[this] var innerIter: Iterator[T] = null
			private[this] var closer: () => Unit = null

			override def preStart(): Unit =
				try{
					val iterAndCloser = iterFactory()
					innerIter = iterAndCloser._1; closer = iterAndCloser._2
					if(!innerIter.hasNext) completeBinTable()
				}catch{
					case ex: Throwable => failBinTable(ex)
				}

			setHandler(out, new OutHandler{
				override def onPull(): Unit =
					try{
						push(out, innerIter.next())
						if(!innerIter.hasNext) completeBinTable()
					}catch{
						case ex: Throwable => failBinTable(ex)
					}
				override def onDownstreamFinish(cause: Throwable): Unit = completeBinTable()
			})

			private def failBinTable(exc: Throwable): Unit = {
				failStage(exc)
				closeReader()
				donePromise.failure(exc)
			}

			private def completeBinTable(): Unit =
				try{
					completeStage()
					closeReader()
					donePromise.success(Done)
				}catch{
					case ex: Throwable => donePromise.failure(ex)
				}

			private def closeReader(): Unit = if(innerIter != null && !iterClosed){
				if(closer != null) closer()
				iterClosed = true
			}

		}
		(logic, donePromise.future)
	}

}
