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

class FileStorageService(folder: File) {
	import FileStorageService._

	if(!folder.exists) {
		assert(folder.mkdirs(), "Failed to create directory " + folder.getAbsolutePath)
	}
	assert(folder.isDirectory, "File storage service must be initialized with a directory path")

	def getFile(hash256Sum: String) = Paths.get(folder.getAbsolutePath, hash256Sum).toFile

	def getFileSavingSink(hash256Sum: String)(implicit ctxt: ExecutionContext): Sink[ByteString, Future[Long]] = {
		val file = getFile(hash256Sum)

		if(file.exists)
			Sink.cancelled.mapMaterializedValue(_ => Future.successful(0))
		else {
			val hashSink = sha256DigestSink.mapMaterializedValue(_.map(getDigestString))
			val fileSink = FileIO.toFile(file)

			Flow[ByteString]
				.alsoToMat(hashSink)(Keep.right)
				.toMat(fileSink)( (hashFut, nbytesFut) =>
	
					hashFut.flatMap(actualHash =>
						if(actualHash == hash256Sum)
							nbytesFut
						else {
							val msg = s"Got hashsum $actualHash, expected $hash256Sum"
							Future.failed(new Exception(msg))
						}
					).andThen{
						case Failure(_) => if(file.exists) file.delete()
					}
				)
		}
	}
}

object FileStorageService{

	val sha256DigestSink: Sink[ByteString, Future[MessageDigest]] = {
		val md = MessageDigest.getInstance("SHA-256")

		Sink.fold[MessageDigest, ByteString](md){(digest, bstr) =>
			val clone = digest.clone.asInstanceOf[MessageDigest]
			bstr.asByteBuffers.foreach(clone.update)
			clone
		}
	}

	def getDigestString(digest: MessageDigest): String = digest.digest.map("%02x" format _).mkString

}
