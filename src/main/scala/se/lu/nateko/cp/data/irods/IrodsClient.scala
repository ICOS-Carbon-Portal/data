package se.lu.nateko.cp.data.irods

import se.lu.nateko.cp.data.IrodsConfig
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.pub.IRODSFileSystem
import org.irods.jargon.core.packinstr.DataObjInp.OpenFlags
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import scala.concurrent.Future
import java.io.OutputStream

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

	def getNewFileOutputStream(filename: String): OutputStream = {
		val connPool = new IRODSConnectionPool
		val fileSystem = new IRODSFileSystem(connPool)
		val fileFactory = fileSystem.getIRODSFileFactory(account)

		val irodsOut = new OutputStreamWithCleanup(
			() => fileFactory.instanceIRODSFileOutputStream(filename, OpenFlags.READ_WRITE_FAIL_IF_EXISTS),
			() => fileSystem.close()
		)
		new java.io.BufferedOutputStream(irodsOut, 2 << 17)
	}

	def getNewFileSink(filename: String): Sink[ByteString, Future[Long]] =
		Sink.outputStream(() => getNewFileOutputStream(filename))

}

