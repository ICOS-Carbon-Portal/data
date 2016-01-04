package se.lu.nateko.cp.data.irods

import java.io.OutputStream
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.Promise
import scala.util.Failure
import scala.util.Success
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.exception.JargonException
import org.irods.jargon.core.packinstr.DataObjInp.OpenFlags
import org.irods.jargon.core.pub.IRODSAccessObjectFactory
import org.irods.jargon.core.pub.IRODSAccessObjectFactoryImpl
import org.irods.jargon.core.pub.io.IRODSFileFactory
import org.irods.jargon.core.pub.io.IRODSFileFactoryImpl
import akka.stream.Attributes
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.StreamConverters
import akka.util.ByteString
import se.lu.nateko.cp.data.api.Sha256Sum
import se.lu.nateko.cp.data.IrodsConfig
import se.lu.nateko.cp.data.streams.ByteStringBuffer
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.ErrorSwallower
import se.lu.nateko.cp.data.streams.OutputStreamWithCleanup

object IrodsClient{
	val bufferSize: Int = 2 << 19 //1 MB

	def apply(config: IrodsConfig) = new IrodsClient(config)
}

class IrodsClient(config: IrodsConfig){
	import IrodsClient._

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
	 * Creates a `ByteString` sink to upload the contents to a new iRODS file.
	 * Materialization fails if the file exists already.
	 * Verifies hash of the uploaded file (compares with the hash of the incoming stream).
	 * Deletes the uploaded file if any problem or hash mismatch occurs.
	 * Materializes a `Future[Sha256Sum]`. The `Future` is successful if upload is successful.
	 * 
	 * @param filePath path to the new file on iRODS
	 * @param executor should be an `ExecutionContext` suitable for running thread-blocking tasks
	 * @return the `ByteString` sink
	 */
	def getNewFileSink(filePath: String)(implicit executor: ExecutionContext): Sink[ByteString, Future[Sha256Sum]] = {
		val streamClosed = Promise[Unit]()

		val irodsSink = StreamConverters
			.fromOutputStream(
				() => getNewFileOutputStreamAndCompletion(filePath, streamClosed)
			)
			//disabling buffer here as we'll be buffering ourselves
			.withAttributes(Attributes.inputBuffer(1, 1))

		//need to swallow upstream errors to avoid OutputStreamSink crash, hence the usage of ErrorSwallower
		val robustIrodsSink: Sink[ByteString, Future[Unit]] = ErrorSwallower[ByteString]()
			.toMat(irodsSink)(
				(upStreamFut, downStreamFut) => for(
					_ <- streamClosed.future; //FIRST, need to wait for the iRODS OutputStream closure
					_ <- upStreamFut;         //want to be able to react to the upstream errors later on
					_ <- downStreamFut        //ok only if everything is ok
				) yield ()
			)

		DigestFlow.sha256
			.via(ByteStringBuffer(bufferSize))
			.toMat(robustIrodsSink)((shaFut, uploadFut) => {

				//compare checksums on iRODS and of the stream
				def ensureEquality(streamDigest: Sha256Sum, irodsDigest: Sha256Sum) =
					if(streamDigest == irodsDigest) Future.successful(streamDigest)
					else Future.failed(new JargonException(
						s"Carbon Portal's checksum $streamDigest did not match EUDAT's checksum $irodsDigest"
					))

				val digestFuture = for(
					streamDigest <- shaFut;
					_ <- uploadFut; //need to wait for the upload to complete before asking for checksum
					irodsDigest <- Future(getChecksum(filePath));
					digest <- ensureEquality(streamDigest, irodsDigest)
				) yield digest

				digestFuture.andThen{
					//delete the file on iRODS if there is either up- or downstream error or checksum mismatch
					case Failure(_) => deleteFile(filePath)
				}
			})
	}

	def deleteFile(filePath: String): Unit = {
		val api = getIrodsFileApi
		try{
			val file = api.fileFactory.instanceIRODSFile(filePath)
			if(!file.deleteWithForceOption())
				throw new JargonException("File deletion failure")
		}finally{
			api.cleanUp()
		}
	}

	def getChecksum(filePath: String): Sha256Sum = {
		val api = getIrodsFileApi
		try{
			val file = api.fileFactory.instanceIRODSFile(filePath)
			val doap = api.accessObjFactory.getDataObjectAO(account)
			val base64 = doap.computeChecksumOnDataObject(file).getChecksumStringValue
			Sha256Sum.fromBase64(base64).get
		}finally{
			api.cleanUp()
		}
	}

	def getNewFileOutputStream(filePath: String): OutputStream =
		getNewFileOutputStreamAndCompletion(filePath, Promise())

	private def getNewFileOutputStreamAndCompletion(filePath: String, done: Promise[Unit]): OutputStream = {
		val api = getIrodsFileApi

		try{
			val irodsOut = api.fileFactory.instanceIRODSFileOutputStream(filePath, OpenFlags.WRITE_FAIL_IF_EXISTS)

			new OutputStreamWithCleanup(irodsOut, () => {
				api.cleanUp()
				done.complete(Success(()))
			})
		}catch{
			case e: Throwable =>
				api.cleanUp()
				done.complete(Failure(e))
				throw e
		}
	}

	private def getIrodsFileApi = new IrodsApi

	private class IrodsApi{
		private val connPool = new IRODSConnectionPool
		private val session = new LocalIrodsSession(connPool)

		lazy val fileFactory: IRODSFileFactory = new IRODSFileFactoryImpl(session, account)
		lazy val accessObjFactory: IRODSAccessObjectFactory = IRODSAccessObjectFactoryImpl.instance(session)

		def cleanUp(): Unit = session.closeSession()
	}

}
