package se.lu.nateko.cp.data.streams

import akka.NotUsed
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
import java.util.Arrays

object ByteStringBuffer {

	/**
	 * Flow buffer of ByteStrings which buffers by the total number of bytes
	 * the ByteStrings contain instead of buffering by the number of the ByteStrings
	 */
	def apply(nBytes: Int): Flow[ByteString, ByteString, NotUsed] = Flow.fromGraph(new ByteStringBuffer(nBytes))

}

private class ByteStringBuffer(nBytes: Int) extends GraphStage[FlowShape[ByteString, ByteString]]{

	assert(nBytes > 0, "Buffer size must be positive")

	private val logger = LoggerFactory.getLogger(getClass)

	private val in: Inlet[ByteString] = Inlet("ByteStringBufferInput")
	private val out: Outlet[ByteString] = Outlet("ByteStringBufferOutput")

	override val shape = FlowShape(in, out)

	override def createLogic(inheritedAttributes: Attributes) = new GraphStageLogic(shape){

		private[this] var buff: Array[Byte] = Array.ofDim(nBytes)
		private[this] var bufSize: Int = 0
		private[this] var residual = ByteString.empty

		private def flush(): Unit =
			if(isClosed(in)) {
				if(bufSize == 0 && residual.isEmpty) completeStage()
				else if(isAvailable(out)) {
					logger.debug(s"About to push ${bufSize + residual.size} bytes")
					push(out, ByteString.fromArray(buff, 0, bufSize) ++ residual)
					completeStage()
				}
			}else if(isAvailable(out) && bufSize == nBytes) {
				logger.debug(s"About to push $nBytes bytes")
				push(out, ByteString(buff))
				buff = Array.ofDim(nBytes)
				bufSize = 0
				appendToBuffer(residual)
				if(bufSize < nBytes && !hasBeenPulled(in)) pull(in)
			}

		private def appendToBuffer(bs: ByteString): Unit = {
			val bytesToAppend = Math.min(bs.size, nBytes - bufSize)
			if(bytesToAppend > 0){
				bs.copyToArray(buff, bufSize, bytesToAppend)
				bufSize += bytesToAppend
				residual = if(bytesToAppend == bs.size)
						ByteString.empty
					else bs.drop(bytesToAppend)
			} else residual = bs
		}

		setHandler(in, new InHandler{
			override def onPush(): Unit = {
				val next = grab(in)

				if(bufSize < nBytes) appendToBuffer(next)
				else residual ++= next

				if(bufSize < nBytes) pull(in)
				else flush()
			}

			override def onUpstreamFinish(): Unit = {
				if(isAvailable(in)) residual ++= grab(in)
				flush()
			}
		})

		setHandler(out, new OutHandler {
			override def onPull(): Unit = {
				if(!hasBeenPulled(in) && !isClosed(in) && !isAvailable(in)) pull(in) //initial pull
				else flush()
			}
		})
	}
}
