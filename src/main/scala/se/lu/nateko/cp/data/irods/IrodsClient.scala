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
	 * An ExecutionContext suitable for running blocking tasks should be provided to this method
	 */
	def getNewFileSink(filePath: String)(implicit executor: ExecutionContext): Sink[ByteString, Future[Long]] =
		StreamConverters.fromOutputStream(() => getNewFileOutputStream(filePath).get)
			.mapMaterializedValue(countFuture => countFuture.andThen{
				case f: Failure[Long] => deleteFile(filePath)
				case _ =>
			})

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

	def getNewFileOutputStream(filePath: String): Try[OutputStream] = {
		val (fileFactory, cleanUp) = getIrodsFileApi

		Try{
			val irodsOut = fileFactory.instanceIRODSFileOutputStream(filePath, OpenFlags.READ_WRITE_FAIL_IF_EXISTS)
			val bufferedOut = new java.io.BufferedOutputStream(irodsOut, IrodsClient.bufSize)
			new OutputStreamWithCleanup(bufferedOut, cleanUp)
		}.recoverWith{
			case e => cleanUp(); Failure(e)
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
