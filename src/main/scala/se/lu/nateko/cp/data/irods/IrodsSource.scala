package se.lu.nateko.cp.data.irods

import scala.concurrent.Await
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.pub.io.IRODSFileFactoryImpl
import org.irods.jargon.core.pub.io.IRODSFileInputStream

import akka.Done
import akka.stream.Attributes
import akka.stream.Outlet
import akka.stream.SourceShape
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.GraphStageWithMaterializedValue
import akka.stream.stage.OutHandler
import akka.util.ByteString

private class IrodsSource(filePath: String, account: IRODSAccount, connPool: IRODSConnectionPool, bufferSize: Int)
					extends GraphStageWithMaterializedValue[SourceShape[ByteString], Future[Long]]{

	private val out: Outlet[ByteString] = Outlet("IrodsSourceOutput")

	override val shape = SourceShape(out)

	override def createLogicAndMaterializedValue(inheritedAttributes: Attributes): (GraphStageLogic, Future[Long]) = {

		val logic = new GraphStageLogic(shape) with IrodsStageLogicHelper {

			private[this] var inStream: IRODSFileInputStream = null
			private[this] var session: LocalIrodsSession = null
			private[this] var count: Long = 0
			private[this] var init: Future[Done] = null

			override def preStart(): Unit = {
				val mat = materializer
				import mat.executionContext

				init = Future{
					session = new LocalIrodsSession(connPool)
					val fileFactory = new IRODSFileFactoryImpl(session, account)
					inStream = fileFactory.instanceIRODSFileInputStream(filePath)
					Done
				}
			}

			setHandler(out, new OutHandler{

				override def onPull(): Unit = {
					try{
						val nextRow = readRow()
						push(out, nextRow)
						if(nextRow.size < bufferSize) {
							complete(out)
							onDownstreamFinish()
						}
					}catch{
						case exc: Throwable => failIrodsSource(exc)
					}
				}

				override def onDownstreamFinish(): Unit = {
					closeInStreamAndSession()

					if(!countPromise.isCompleted){
						countPromise.success(count)
					}
					completeStage()
				}
			})

			private def readRow(): ByteString = {
				if(inStream == null){
					Await.result(init, 10.seconds)
				}
				val bytes = Array.ofDim[Byte](bufferSize)
				val hasRead = inStream.read(bytes)
				count += hasRead

				if(hasRead == bufferSize)
					ByteString(bytes)
				else
					ByteString(bytes.take(hasRead))
			}

			private def failIrodsSource(exc: Throwable): Unit = {
				closeInStreamAndSession()
				failResult(exc)
				failStage(exc)
			}

			private def closeInStreamAndSession(): Unit = if(init != null) {
				val mat = materializer
				import mat.executionContext
				init.onComplete { _ =>
					doOrFailResult{
						if(inStream != null){
							inStream.close()
							inStream = null
						}
					}
					doOrFailResult{
						if(session != null){
							session.closeSession()
							session = null
						}
					}
				}
			}
		}
		(logic, logic.countPromise.future)
	}

}
