package se.lu.nateko.cp.data.services.etcfacade

import java.nio.file.Files
import java.nio.file.Paths

import scala.concurrent.Future

import akka.Done
import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.EtcFacadeConfig
import se.lu.nateko.cp.data.api.ChecksumError
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.crypto.Md5Sum

class FacadeService(config: EtcFacadeConfig)(implicit mat: Materializer) {
	import mat.executionContext

	def getFileSink(file: EtcFilename, md5: Md5Sum): Sink[ByteString, Future[Done]] = {
		val path = Paths.get(config.folder, file.station.id, file.toString)
		Files.createDirectories(path.getParent)

		Flow.apply[ByteString]
			.viaMat(DigestFlow.md5)(Keep.right)
			.toMat(FileIO.toPath(path)){(md5Fut, ioFut) =>

			val res = (for(
				md5Actual <- md5Fut;
				ioRes <- ioFut;
				_ <- Future.fromTry(ioRes.status)
			) yield
				if(md5Actual == md5)
					Future.successful(Done)
				else
					Future.failed(new ChecksumError(s"Expected MD5 checksum $md5, got $md5Actual"))
			).flatten

			res.failed.foreach(_ => Files.deleteIfExists(path))

			res
		}
	}
}
