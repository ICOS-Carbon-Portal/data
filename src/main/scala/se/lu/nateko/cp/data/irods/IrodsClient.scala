package se.lu.nateko.cp.data.irods

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.exception.JargonException
import org.irods.jargon.core.protovalues.ChecksumEncodingEnum
import org.irods.jargon.core.pub.IRODSAccessObjectFactory
import org.irods.jargon.core.pub.IRODSAccessObjectFactoryImpl
import org.irods.jargon.core.pub.io.IRODSFile
import org.irods.jargon.core.pub.io.IRODSFileFactory
import org.irods.jargon.core.pub.io.IRODSFileFactoryImpl

import akka.actor.ActorSystem
import akka.stream.ActorAttributes
import akka.stream.Attributes
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.HardConfig
import se.lu.nateko.cp.data.IrodsConfig
import se.lu.nateko.cp.data.streams.ByteStringBuffer
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

object IrodsClient{
	val bufferSize: Int = 2 << 22 //8 MB

	def apply(config: IrodsConfig)(implicit system: ActorSystem) = new IrodsClient(config, new IRODSConnectionPool)

}

class IrodsClient private(config: IrodsConfig, connPool: IRODSConnectionPool){
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

	private val existingFolderPaths = scala.collection.mutable.Set.empty[String]

	/**
	 * Creates a `ByteString` sink to upload the contents to a new iRODS file.
	 * Fetches the hash of the uploaded file.
	 * Materializes a `Future[Sha256Sum]`. The `Future` is successful if upload is successful.
	 * Upload will fail if the file already exists.
	 * 
	 * @param filePath path to the new file on iRODS
	 * @param executor should be an `ExecutionContext` suitable for running thread-blocking tasks
	 * @return the `ByteString` sink
	 */
	def getNewFileSink(filePath: String)(implicit executor: ExecutionContext): Sink[ByteString, Future[Sha256Sum]] = {

		val irodsSink = Sink.fromGraph(new IrodsSink(filePath, account, connPool))
			//disabling buffer here as we'll be buffering ourselves
			.withAttributes(Attributes.inputBuffer(1, 1))
			.withAttributes(ActorAttributes.dispatcher(HardConfig.ioDispatcher))

		ByteStringBuffer(bufferSize)
			.toMat(irodsSink){(_, uploadFut) =>
				for(
					_ <- uploadFut; //need to wait for the upload to succeed before asking for checksum
					irodsDigest <- Future(getChecksum(filePath))
				) yield irodsDigest
			}
	}

	def getFileSource(filePath: String): Source[ByteString, Future[Long]] =
		Source.fromGraph(new IrodsSource(filePath, account, connPool, bufferSize))

	def deleteFile(filePath: String): Unit = withFileApi{api =>
		val file = api.makeFile(filePath)
		if(!file.deleteWithForceOption())
			throw new JargonException("File deletion failure")
	}

	def fileExists(filePath: String): Boolean = withFileApi(_.makeFile(filePath).exists)

	/**
	 * This operation is cached to be executed only once per folderPath during lifetime of IrodsClient.
	 * No check if done for whether the folder was deleted after creation.
	 */
	def ensureFolderExists(folderPath: String): Unit =
		if(!existingFolderPaths.contains(folderPath))
		{
			withFileApi{api =>
				val folder: IRODSFile = api.makeFile(folderPath)
				if(!folder.exists) folder.mkdir()
				existingFolderPaths.add(folderPath)
			}
		}

	def getChecksum(filePath: String): Sha256Sum = withFileApi{api =>
		val docuao = api.accessObjFactory.getDataObjectChecksumUtilitiesAO(account)

		val checksum = try{
			docuao.retrieveExistingChecksumForDataObject(filePath)
		}catch{
			case _: Throwable =>
				val file = api.fileFactory.instanceIRODSFile(filePath)
				docuao.computeChecksumOnDataObject(file)
		}

		val hashKind = checksum.getChecksumEncoding
		if(hashKind != ChecksumEncodingEnum.SHA256)
			throw new Exception(s"Expected iRODS checksum to be SHA-256, got $hashKind")

		Sha256Sum.fromBase64(checksum.getChecksumStringValue).get
	}

	private def withFileApi[T](op: IrodsApi => T): T = {
		val api = new IrodsApi
		try{
			op(api)
		} finally{
			api.cleanUp()
		}
	}

	private class IrodsApi{
		private val session = new LocalIrodsSession(connPool)

		lazy val fileFactory: IRODSFileFactory = new IRODSFileFactoryImpl(session, account)
		lazy val accessObjFactory: IRODSAccessObjectFactory = IRODSAccessObjectFactoryImpl.instance(session)

		def makeFile(filePath: String): IRODSFile = fileFactory.instanceIRODSFile(filePath)
		def cleanUp(): Unit = session.closeSession()
	}

}
