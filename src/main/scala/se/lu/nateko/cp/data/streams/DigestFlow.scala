package se.lu.nateko.cp.data.streams

import java.security.MessageDigest
import java.util.Base64

import scala.concurrent.Future
import scala.concurrent.Promise
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
import akka.util.ByteString

object DigestFlow{

	def sha1 = forDigest("SHA-1")
	def sha256 = forDigest("SHA-256")

	def toBase64(digest: Array[Byte]): String =
		Base64.getEncoder.encodeToString(digest)

	private def forDigest(digestName: String): Flow[ByteString, ByteString, Future[Array[Byte]]] =
		Flow.fromGraph(new DigestFlow(digestName))
}

private class DigestFlow(digest: String) extends GraphStageWithMaterializedValue[FlowShape[ByteString, ByteString], Future[Array[Byte]]]{

	private[this] val in: Inlet[ByteString] = Inlet("DigestComputerInput")
	private[this] val out: Outlet[ByteString] = Outlet("DigestComputerOutput")

	override val shape = FlowShape(in, out)

	override def createLogicAndMaterializedValue(inheritedAttributes: Attributes): (GraphStageLogic, Future[Array[Byte]]) = {

		val logic = new GraphStageLogic(shape){

			val matValPromise = Promise[Array[Byte]]()
			private val md = MessageDigest.getInstance(digest)

			setHandler(in, new InHandler{
				override def onPush(): Unit = {
					val bs = grab(in)
					bs.asByteBuffers.foreach(md.update)
					push(out, bs)
				}

				override def onUpstreamFinish(): Unit = {
					super.onUpstreamFinish()
					matValPromise.complete(Success(md.digest))
				}
			})

			setHandler(out, new OutHandler {
				override def onPull(): Unit = pull(in)
			})
		}

		(logic, logic.matValPromise.future)
	}
}
