package se.lu.nateko.cp.data.irods

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.packinstr.DataObjInp.OpenFlags
import org.irods.jargon.core.pub.io.IRODSFileFactoryImpl
import org.irods.jargon.core.pub.io.IRODSFileOutputStream

import akka.stream.Attributes
import akka.stream.Inlet
import akka.stream.SinkShape
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.GraphStageWithMaterializedValue
import akka.stream.stage.InHandler
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.utils.TimeLimitedExecution


private class IrodsSink(filePath: String, account: IRODSAccount, connPool: IRODSConnectionPool)
					extends GraphStageWithMaterializedValue[SinkShape[ByteString], Future[Long]]{

	private val in: Inlet[ByteString] = Inlet("IrodsSinkInput")

	override val shape = SinkShape(in)

	override def createLogicAndMaterializedValue(inheritedAttributes: Attributes): (GraphStageLogic, Future[Long]) = {

		val logic = new GraphStageLogic(shape) with IrodsStageLogicHelper {

			private[this] var outStream: IRODSFileOutputStream = null
			private[this] var session: LocalIrodsSession = null
			private[this] var count: Long = 0

			override def preStart(): Unit = pull(in)
	
			setHandler(in, new InHandler{

				override def onPush(): Unit = {
					val nextRow = grab(in)
					pull(in)
					writeRow(nextRow)
				}

				override def onUpstreamFinish(): Unit = {
					if(isAvailable(in)) writeRow(grab(in))

					closeOutStreamAndSession()

					if(!countPromise.isCompleted){
						countPromise.success(count)
					}
				}

				override def onUpstreamFailure(exc: Throwable): Unit = failIrodsSink(exc)
			})

			private def writeRow(row: ByteString): Unit =
				try{
					if(outStream == null) initIrodsStream()
					val bytes = Array.ofDim[Byte](row.length)
					row.copyToArray(bytes)
					outStream.write(bytes)
					count += bytes.length
				}catch{
					case exc: Throwable => failIrodsSink(exc)
				}

			private def initIrodsStream(): Unit = {
				val mat = materializer
				import mat.executionContext
				TimeLimitedExecution(10.seconds, new CpDataException(s"Timout while waiting for IRODS to start upload to $filePath")){
					session = new LocalIrodsSession(connPool)
					val fileFactory = new IRODSFileFactoryImpl(session, account)
					outStream = fileFactory.instanceIRODSFileOutputStream(filePath, OpenFlags.WRITE_FAIL_IF_EXISTS)
				}
			}

			private def failIrodsSink(exc: Throwable): Unit = {
				failStage(exc)
				closeOutStreamAndSession()
				failResult(exc)
			}

			private def closeOutStreamAndSession(): Unit = {
				doOrFailResult{
					if(outStream != null){
						outStream.flush()
						outStream.close()
						outStream = null
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
		(logic, logic.countPromise.future)
	}

}
