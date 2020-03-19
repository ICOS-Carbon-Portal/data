package se.lu.nateko.cp.data.streams

import java.io.BufferedOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

import scala.collection.mutable.Queue

import ZipEntryFlow.ZipEntrySegment
import ZipEntryFlow.ZipEntryStart
import ZipEntryFlow.ZipFlowElement
import akka.NotUsed
import akka.stream.Attributes
import akka.stream.FlowShape
import akka.stream.Inlet
import akka.stream.Outlet
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Source
import akka.stream.stage.GraphStage
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.InHandler
import akka.stream.stage.OutHandler
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpDataException

object ZipEntryFlow {

	sealed trait ZipFlowElement
	case class ZipEntryStart(fileName: String) extends ZipFlowElement
	case class ZipEntrySegment(bytes: ByteString) extends ZipFlowElement

	type FileLikeSource = Source[ByteString, Any]
	type FileEntry = (String, FileLikeSource)

	def getMultiEntryZipStream(entries: Source[FileEntry, NotUsed]) : Source[ByteString, NotUsed] = {
		val zipFlowSources = entries.flatMapConcat{
			case (fileName, fileSource) =>
				val headerSource: Source[ZipFlowElement, NotUsed] = Source.single(new ZipEntryStart(fileName))
				val bodySource: Source[ZipFlowElement, NotUsed] =
					fileSource.map(bs => new ZipEntrySegment(bs)).mapMaterializedValue(_ => NotUsed)
				headerSource.concat(bodySource)
		}
		zipFlowSources.via(Flow.fromGraph(new ZipEntryFlow))
	}

	val singleEntryUnzip: Flow[ByteString, ByteString, NotUsed] = Flow.fromGraph(new SingleEntryUnzipFlow)
}


private class ZipEntryFlow extends GraphStage[FlowShape[ZipFlowElement, ByteString]]{

	private val in: Inlet[ZipFlowElement] = Inlet("ZipEntryFlowInput")
	private val out: Outlet[ByteString] = Outlet("ZipEntryFlowOutput")

	override val shape = FlowShape(in, out)

	override def createLogic(inheritedAttributes: Attributes) = new GraphStageLogic(shape){

		private val bsq = Queue.empty[ByteString]

		private val os = new java.io.OutputStream{
			override def write(b: Array[Byte]) = bsq += ByteString(b)
			override def write(b: Array[Byte], off: Int, len: Int) = bsq += ByteString.fromArray(b, off, len)
			override def write(b: Int) = bsq += ByteString(b.toByte)
		}

		private val zos = new ZipOutputStream(new BufferedOutputStream(os))

		override def preStart(): Unit = pull(in) //initial pull

		setHandler(in, new InHandler{
			override def onPush(): Unit = {
				grabAndZip()
				if(bsq.isEmpty) pull(in)
				else if(isAvailable(out)) pushResultOut()
			}

			override def onUpstreamFinish(): Unit = {
				if(isAvailable(in)) grabAndZip()
				zos.close()
				if(isAvailable(out)) pushResultOut()
			}
		})

		setHandler(out, new OutHandler {
			override def onPull(): Unit = pushResultOut()
		})

		private def grabAndZip(): Unit = grab(in) match {
			case ZipEntryStart(fileName) =>
				zos.putNextEntry(new ZipEntry(fileName))

			case ZipEntrySegment(bytes) =>
				val arr = Array.ofDim[Byte](bytes.size)
				bytes.copyToArray(arr)
				zos.write(arr)
		}

		private def pushResultOut(): Unit = {
			if(!bsq.isEmpty) push(out, bsq.dequeue())

			if(bsq.isEmpty && !hasBeenPulled(in) && !isAvailable(in)) {
				if(isClosed(in)) completeStage()
				else pull(in)
			}
		}
	}
}


private class SingleEntryUnzipFlow extends GraphStage[FlowShape[ByteString, ByteString]]{

	private val in: Inlet[ByteString] = Inlet("SingleEntryUnzipFlowInput")
	private val out: Outlet[ByteString] = Outlet("SingleEntryUnzipFlowOutput")

	override val shape = FlowShape(in, out)

	override def createLogic(inheritedAttributes: Attributes) = new GraphStageLogic(shape){

		private val oq = new ByteStringQueueInputStream
		private val zis = new ZipInputStream(oq)
		private var entrySize: Long = -2
		private var readSize: Long = 0
		private def gotFirstEntry = entrySize > -2
		private val bufSize = 8192
		private val buff = Array.ofDim[Byte](bufSize)

		override def preStart(): Unit = pull(in) //initial pull

		setHandler(in, new InHandler{

			override def onPush(): Unit = {
				oq.append(grab(in))
				if(!gotFirstEntry && oq.available < bufSize || isAvailable(out) && oq.available < bufSize * 2) {
					pull(in)
				}
				if(!gotFirstEntry && oq.available >= bufSize) getFirstEntry()
				if(gotFirstEntry && isAvailable(out)) pushResultOut()
			}

			override def onUpstreamFinish(): Unit = {
				if(isAvailable(in)) oq.append(grab(in))
				oq.finishAppending()
				if(!gotFirstEntry && oq.available > 0) getFirstEntry()
				pushResultOut()
			}
		})

		setHandler(out, new OutHandler {
			override def onPull(): Unit = {
				if(!hasBeenPulled(in) && !isClosed(in) && oq.available < bufSize * 2) {
					pull(in)
				}
				pushResultOut()
			}
			override def onDownstreamFinish(cause: Throwable): Unit = {
				oq.finishAppending()
				zis.close()
				oq.close()
				completeStage()
			}
		})

		private def getFirstEntry(): Unit = {
			val entry = zis.getNextEntry()
			if(entry == null) throw new CpDataException("No entry found in the ZIP archive")
			entrySize = entry.getSize
		}

		private def pushResultOut(): Unit = {

			var nread = 0

			if(
				gotFirstEntry && isAvailable(out) &&
				(readSize < entrySize || entrySize == -1) &&
				(upstreamFinished || oq.available > bufSize)
			){
				val toRead = if(entrySize == -1) buff.length
					else Math.min(buff.length.toLong, entrySize - readSize).toInt

				nread = zis.read(buff, 0, toRead)
				if(nread > 0){
					readSize += nread
					push(out, ByteString.fromArray(buff, 0, nread))
				}
			}

			if(upstreamFinished && (readSize == entrySize || entrySize == -1 && nread < 0)) {
				//oq must have been closed from the InputHandler by now
				zis.close()
				completeStage()
			}
		}

		private def upstreamFinished: Boolean = isClosed(in) && !isAvailable(in) && !hasBeenPulled(in)
	}
}
