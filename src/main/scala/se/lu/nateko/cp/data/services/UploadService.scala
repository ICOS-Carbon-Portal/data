package se.lu.nateko.cp.data.services

import java.io.File
import java.nio.file.Paths
import java.security.MessageDigest
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import akka.stream.scaladsl.FileIO
import se.lu.nateko.cp.data.irods.IrodsClient
import se.lu.nateko.cp.data.streams.ErrorSwallower
import se.lu.nateko.cp.data.api.Utils
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.meta.core.data.DataPackage
import se.lu.nateko.cp.cpauth.core.UserInfo

class UploadService(folder: File, irods: IrodsClient, meta: MetaClient) {

	import meta.dispatcher

	if(!folder.exists) {
		assert(folder.mkdirs(), "Failed to create directory " + folder.getAbsolutePath)
	}
	assert(folder.isDirectory, "File storage service must be initialized with a directory path")

	def getFile(hash: Sha256Sum) = Paths.get(folder.getAbsolutePath, hash.base64Url).toFile

	def getFileSavingSink(hash: Sha256Sum): Sink[ByteString, Future[Long]] = {
		val file = getFile(hash)

		if(file.exists)
			Sink.cancelled.mapMaterializedValue(_ => Future.successful(0))
		else {
			val irodsSink = irods.getNewFileSink(hash.base64Url)
			val fileSink = FileIO.toFile(file)

			ErrorSwallower[ByteString]()
				.alsoToMat(irodsSink)(Keep.both)
				.toMat(fileSink){ case ((upstreamFut, hashFut), nbytesFut) =>
	
					val uploadedBytesFut = for(
						_ <- Utils.waitForAll(hashFut, nbytesFut, upstreamFut);
						actualHash <- hashFut;
						nBytes <- nbytesFut;
						_ <- upstreamFut
					) yield
						if(actualHash == hash) nBytes
						else throw new Exception(s"Got hashsum $actualHash, expected $hash")

					uploadedBytesFut.andThen{
						case Failure(_) => if(file.exists) file.delete()
					}.andThen{
						case Failure(_) => irods.deleteFile(hash.base64Url)
					}
				}
		}
	}

	def getSink(hash: Sha256Sum, user: UserInfo): Future[Sink[ByteString, Future[Long]]] = {
		for(
			dataObj <- meta.lookupPackage(hash);
			_ <- meta.userIsAllowedUpload(dataObj, user)
		) yield getFileSavingSink(hash)
	}
}
