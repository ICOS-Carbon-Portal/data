package se.lu.nateko.cp.data.irods

import scala.concurrent.Await
import scala.concurrent.Future
import scala.concurrent.Promise
import scala.concurrent.duration.DurationInt

import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.packinstr.DataObjInp.OpenFlags
import org.irods.jargon.core.pub.io.IRODSFileFactoryImpl
import org.irods.jargon.core.pub.io.IRODSFileOutputStream

import akka.Done
import akka.stream.Attributes
import akka.stream.Inlet
import akka.stream.SinkShape
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.GraphStageWithMaterializedValue
import akka.stream.stage.InHandler
import akka.util.ByteString


private class IrodsSink(filePath: String, account: IRODSAccount, connPool: IRODSConnectionPool)
					extends GraphStageWithMaterializedValue[SinkShape[ByteString], Future[Long]]{

	private val in: Inlet[ByteString] = Inlet("IrodsSinkInput")

	override val shape = SinkShape(in)

	override def createLogicAndMaterializedValue(inheritedAttributes: Attributes): (GraphStageLogic, Future[Long]) = {

		val logic = new GraphStageLogic(shape){

			private[this] var outStream: IRODSFileOutputStream = null
			private[this] var session: LocalIrodsSession = null
			private[this] var count: Long = 0
			private[this] var init: Future[Done] = null

			val countPromise = Promise[Long]()

			override def preStart(): Unit = {
				val mat = materializer
				import mat.executionContext

				init = Future{
					session = new LocalIrodsSession(connPool)
					val fileFactory = new IRODSFileFactoryImpl(session, account)
					outStream = fileFactory.instanceIRODSFileOutputStream(filePath, OpenFlags.WRITE_FAIL_IF_EXISTS)
					Done
				}
				pull(in)
			}
	
			setHandler(in, new InHandler{

				override def onPush(): Unit = {
					val nextRow = grab(in)
					pull(in)
					writeRow(nextRow)
				}

				override def onUpstreamFinish(): Unit = {
					if(isAvailable(in)) writeRow(grab(in))
					closeOutStream()
				}

				override def onUpstreamFailure(ex: Throwable): Unit = failIrodsSink(ex)
			})

			private def writeRow(row: ByteString): Unit =
				try{
					if(outStream == null){
						Await.result(init, 10 seconds)
					}
					val bytes = row.asByteBuffer.array
					outStream.write(bytes)
					count += bytes.length
				}catch{
					case err: Throwable => failIrodsSink(err)
				}

			private def failIrodsSink(exc: Throwable): Unit = {
				failStage(exc)
				try{
					closeOutStream()
					countPromise.failure(exc)
				}catch{
					case irodsExc: Throwable => countPromise.failure(irodsExc)
				}
			}

			private def closeOutStream(): Unit = {
				if(outStream != null){
					outStream.flush()
					outStream.close()
					outStream = null
				}
				if(session != null){ 
					session.closeSession()
					session = null
				}
			}

		}
		(logic, logic.countPromise.future)
	}

}
