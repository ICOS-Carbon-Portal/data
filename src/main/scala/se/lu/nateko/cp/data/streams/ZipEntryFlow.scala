package se.lu.nateko.cp.data.streams

import java.io.BufferedOutputStream
import java.io.PipedInputStream
import java.io.PipedOutputStream
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

		private val os = new PipedOutputStream()
		private val is = new PipedInputStream(os)
		private val zis = new ZipInputStream(is)
		private var gotNextEntry = false
		private val buff = Array.ofDim[Byte](8096)

		override def preStart(): Unit = pull(in) //initial pull

		setHandler(in, new InHandler{
			override def onPush(): Unit = {
				grabAndPipe()
				if(isAvailable(out)) {
					pull(in)
					pushResultOut()
				}
			}

			override def onUpstreamFinish(): Unit = {
				if(isAvailable(in)) grabAndPipe()
				//println("Upstream finish, closing piped os")
				os.close()
				if(isAvailable(out)) pushResultOut()
				zis.close()
				completeStage()
			}
		})

		setHandler(out, new OutHandler {
			override def onPull(): Unit = pushResultOut()
		})

		private def grabAndPipe(): Unit = {
			//println("grabbing input")
			val bs = grab(in)
			val arr = Array.ofDim[Byte](bs.size)
			bs.copyToArray(arr)
			//println(s"grabbed ${arr.length} bytes, writing to os")
			os.write(arr)
		}

		private def pushResultOut(): Unit = if(is.available > 0){
			if(!gotNextEntry) {
				//println("Getting the first entry")
				zis.getNextEntry()
				gotNextEntry = true
				//println("Got the first entry")
			}

			//println("See if we can read output...")
			while(isAvailable(out) && zis.available == 1){
				val nread = zis.read(buff)
				//println(s"Have read $nread bytes")
				if(nread > 0){
					push(out, ByteString.fromArray(buff, 0, nread))
				}
			}
			if(zis.available == 0) {
				//println(s"Have read all output, closing streams and completing stage")
				os.close()
				zis.close()
				completeStage()
			}
		}
	}
}
