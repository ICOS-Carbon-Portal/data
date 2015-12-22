package se.lu.nateko.cp.data.irods

import java.io.OutputStream
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.{Try, Success, Failure}
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.packinstr.DataObjInp.OpenFlags
import org.irods.jargon.core.pub.IRODSFileSystem
import org.irods.jargon.core.pub.io.IRODSFileFactory
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.StreamConverters
import akka.util.ByteString
import se.lu.nateko.cp.data.IrodsConfig
import org.irods.jargon.core.exception.JargonException

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
		val (fileSystem, fileFactory) = getIrodsFileApi
		try{
			val file = fileFactory.instanceIRODSFile(filePath)
			if(file.deleteWithForceOption())
				Success(())
			else
				Failure(new JargonException("Deletion operation reports failure"))
		}catch{
			case e: Throwable => Failure(e)
		}finally{
			fileSystem.close()
		}
	}

	def getNewFileOutputStream(filePath: String): Try[OutputStream] = {
		val (fileSystem, fileFactory) = getIrodsFileApi

		Try{
			val irodsOut = fileFactory.instanceIRODSFileOutputStream(filePath, OpenFlags.READ_WRITE_FAIL_IF_EXISTS)
			val bufferedOut = new java.io.BufferedOutputStream(irodsOut, IrodsClient.bufSize)
			new OutputStreamWithCleanup(bufferedOut, fileSystem.close)
		}.recoverWith{
			case e => fileSystem.close(); Failure(e)
		}
	}

	private def getIrodsFileApi = {
		val connPool = new IRODSConnectionPool
		val fileSystem = new IRODSFileSystem(connPool)
		val fileFactory = fileSystem.getIRODSFileFactory(account)
		(fileSystem, fileFactory)
	}
}

object IrodsClient{
	val bufSize: Int = 2 << 18 //512 KB
}