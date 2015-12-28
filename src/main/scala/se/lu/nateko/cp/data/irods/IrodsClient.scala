package se.lu.nateko.cp.data.irods

import java.io.OutputStream
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success
import scala.util.Try
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.exception.JargonException
import org.irods.jargon.core.packinstr.DataObjInp.OpenFlags
import org.irods.jargon.core.pub.io.IRODSFileFactory
import org.irods.jargon.core.pub.io.IRODSFileFactoryImpl
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.StreamConverters
import akka.util.ByteString
import se.lu.nateko.cp.data.IrodsConfig
import scala.concurrent.Promise

class IrodsClient(config: IrodsConfig){

	private val account = IRODSAccount.instance(
		config.host,
		config.port,
		config.username,
		config.password,
		config.homeDirectory,
		config.zone,
		config.defaultResource
	)

	/**
	 * The implicit argument should be an ExecutionContext suitable for running thread-blocking tasks
	 */
	def getNewFileSink(filePath: String)(implicit executor: ExecutionContext): Sink[ByteString, Future[Long]] = {
		val streamClosed = Promise[Unit]()

		val irodsSink = StreamConverters.fromOutputStream(
			() => getNewFileOutputStreamAndCompletion(filePath, streamClosed).get
		)

		//need to swallow upstream errors to avoid OutputStreamSink crash, hence the usage of StreamRecoverer
		val upstreamErrorsHandlingSink = StreamRecoverer[ByteString]().toMat(irodsSink)(
			(upStreamFut, downStreamFut) => for(
				_ <- streamClosed.future;     //FIRST, need to wait for the iRODS OutputStream closure
				_ <- upStreamFut;             //want to be able to react to the upstream errors later on
				bytesWritten <- downStreamFut //ok only if everything else is ok
			) yield bytesWritten
		)

		//ensure cleanup on iRODS if there is either up- or downstream error
		upstreamErrorsHandlingSink.mapMaterializedValue(countFuture => countFuture.andThen{
				case f: Failure[Long] => deleteFile(filePath)
				case _ =>
			})
	}

	def deleteFile(filePath: String): Try[Unit] = {
		val (fileFactory, cleanUp) = getIrodsFileApi
		try{
			val file = fileFactory.instanceIRODSFile(filePath)
			if(file.deleteWithForceOption())
				Success(())
			else
				Failure(new JargonException("Deletion operation reports failure"))
		}catch{
			case e: Throwable => Failure(e)
		}finally{
			cleanUp()
		}
	}

	def getNewFileOutputStream(filePath: String): Try[OutputStream] =
		getNewFileOutputStreamAndCompletion(filePath, Promise())

	private def getNewFileOutputStreamAndCompletion(filePath: String, done: Promise[Unit]): Try[OutputStream] = {
		val (fileFactory, cleanUp) = getIrodsFileApi

		Try{
			val irodsOut = fileFactory.instanceIRODSFileOutputStream(filePath, OpenFlags.READ_WRITE_FAIL_IF_EXISTS)
			val bufferedOut = new java.io.BufferedOutputStream(irodsOut, IrodsClient.bufSize)

			new OutputStreamWithCleanup(bufferedOut, () => {
				cleanUp()
				done.complete(Success(()))
			})
		}.recoverWith{
			case e =>
				cleanUp()
				val fail = Failure(e)
				done.complete(fail)
				fail
		}
	}

	private def getIrodsFileApi: (IRODSFileFactory, () => Unit) = {
		val connPool = new IRODSConnectionPool
		val session = new LocalIrodsSession(connPool)
		val fileFactory = new IRODSFileFactoryImpl(session, account)
		(fileFactory, session.closeSession)
	}
}

object IrodsClient{
	val bufSize: Int = 2 << 18 //512 KB
}
