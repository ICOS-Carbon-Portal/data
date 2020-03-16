package se.lu.nateko.cp.data.irods

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.irods.jargon.core.connection.AuthScheme
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
import se.lu.nateko.cp.data.IrodsConfig
import se.lu.nateko.cp.data.streams.ByteStringBuffer
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import java.nio.file.Path

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
	config.authenticationScheme.foreach{authSchemeStr =>
		account.setAuthenticationScheme(AuthScheme.findTypeByString(authSchemeStr))
	}

	private val existingFolderPaths = scala.collection.mutable.Set.empty[String]

	/**
	 * Creates a `ByteString` sink to upload the contents to a new iRODS file.
	 * Fetches the hash of the uploaded file.
	 * Materializes a `Future[Sha256Sum]`. The `Future` is successful if upload is successful.
	 * Upload will fail if the file already exists.
	 * 
	 * @param relFilePath path to the new file on iRODS, relative to the home directory (no './' in the beginning)
	 * @param executor should be an `ExecutionContext` suitable for running thread-blocking tasks
	 * @return the `ByteString` sink
	 */
	def getNewFileSink(relFilePath: String)(implicit executor: ExecutionContext): Sink[ByteString, Future[Sha256Sum]] =
		if(config.dryRun){
			DigestFlow.sha256.to(Sink.ignore)
		} else {

		val irodsSink = Sink.fromGraph(new IrodsSink(relFilePath, account, connPool))
			//disabling buffer here as we'll be buffering ourselves
			.withAttributes(Attributes.inputBuffer(1, 1))
			.withAttributes(Attributes(ActorAttributes.IODispatcher))

		ByteStringBuffer(bufferSize)
			.toMat(irodsSink){(_, uploadFut) =>
				for(
					_ <- uploadFut; //need to wait for the upload to succeed before asking for checksum
					irodsDigest <- Future(getChecksum(relFilePath))
				) yield irodsDigest
			}
	}

	def getFileSource(filePath: String): Source[ByteString, Future[Long]] =
		if(config.dryRun)
			Source.empty.mapMaterializedValue(_ => Future.successful(0))
		else
		Source.fromGraph(new IrodsSource(filePath, account, connPool, bufferSize))

	def deleteFile(filePath: String): Unit = if(config.dryRun) () else withFileApi{api =>
		val file = api.makeFile(filePath)
		if(!file.deleteWithForceOption())
			throw new JargonException("File deletion failure")
	}

	def fileExists(filePath: String): Boolean = !config.dryRun && withFileApi(_.makeFile(filePath).exists)

	/**
	 * This operation is cached to be executed only once per folderPath during lifetime of IrodsClient.
	 * No check is done for whether the folder was deleted after creation.
	 */
	def ensureFolderExists(folderPath: String): Unit = if(config.dryRun) () else
		if(!existingFolderPaths.contains(folderPath))
		{
			withFileApi{api =>
				val folder: IRODSFile = api.makeFile(folderPath)
				if(!folder.exists) folder.mkdir()
				existingFolderPaths.add(folderPath)
			}
		}

	def listFolderContents(folderPath: String): Array[Path] = withFileApi{api =>
		val file = api.makeFile(folderPath)
		if(file.isDirectory()) file.listFiles().map(_.toPath)
		else if(file.exists()) Array(file.getAbsoluteFile.toPath)
		else Array.empty
	}

	def getChecksum(relFilePath: String): Sha256Sum =
		if(config.dryRun) Sha256Sum.fromString("0" * 64).get
	else withFileApi{api =>
		val docuao = api.accessObjFactory.getDataObjectChecksumUtilitiesAO(account)

		val filePath = account.getHomeDirectory + "/" + relFilePath

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
