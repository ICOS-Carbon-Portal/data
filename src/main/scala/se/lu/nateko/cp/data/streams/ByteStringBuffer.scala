package se.lu.nateko.cp.data.streams

import akka.stream.Attributes
import akka.stream.FlowShape
import akka.stream.Inlet
import akka.stream.Outlet
import akka.stream.scaladsl.Flow
import akka.stream.stage.GraphStage
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.InHandler
import akka.stream.stage.OutHandler
import akka.util.ByteString
import org.slf4j.LoggerFactory

object ByteStringBuffer {

	/**
	 * Flow buffer of ByteStrings which buffers by the total number of bytes
	 * the ByteStrings contain instead of buffering by the number of the ByteStrings
	 */
	def apply(nBytes: Int): Flow[ByteString, ByteString, Unit] = Flow.fromGraph(new ByteStringBuffer(nBytes))

}

private class ByteStringBuffer(nBytes: Int) extends GraphStage[FlowShape[ByteString, ByteString]]{

	assert(nBytes > 0, "Buffer size must be positive")

	private val logger = LoggerFactory.getLogger(getClass)

	private val in: Inlet[ByteString] = Inlet("ByteStringBufferInput")
	private val out: Outlet[ByteString] = Outlet("ByteStringBufferOutput")

	override val shape = FlowShape(in, out)

	override def createLogic(inheritedAttributes: Attributes) = new GraphStageLogic(shape){

		private[this] var buffer = ByteString.empty

		private def flush(): Unit =
			if(isClosed(in)) {
				if(buffer.isEmpty) completeStage()
				else if(isAvailable(out)) {
					logger.debug(s"About to push ${buffer.length} bytes")
					push(out, buffer)
					completeStage()
				}
			}else if(isAvailable(out) && buffer.length >= nBytes) {
				logger.debug(s"About to push $nBytes bytes")
				push(out, buffer.take(nBytes))
				buffer = buffer.drop(nBytes)
				if(!hasBeenPulled(in)) pull(in)
			}

		setHandler(in, new InHandler{
			override def onPush(): Unit = {
				buffer ++= grab(in)
				if(buffer.length < nBytes) pull(in)
				else flush()
			}

			override def onUpstreamFinish(): Unit = {
				if(isAvailable(in)) buffer ++= grab(in)
				flush()
			}
		})

		setHandler(out, new OutHandler {
			override def onPull(): Unit = {
				if(buffer.isEmpty && !isClosed(in) && !hasBeenPulled(in)) pull(in) //initial pull
				else flush()
			}
		})
	}
}
