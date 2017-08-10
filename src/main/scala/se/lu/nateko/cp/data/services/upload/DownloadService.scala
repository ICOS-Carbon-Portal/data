package se.lu.nateko.cp.data.services.upload

import scala.concurrent.ExecutionContext
import scala.util.Failure
import scala.util.Success

import akka.NotUsed
import akka.event.LoggingAdapter
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.streams.ZipEntryFlow
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject

class DownloadService(upload: UploadService, log: LoggingAdapter)(implicit ctxt: ExecutionContext) {

	def getZipSource(hashes: Seq[Sha256Sum], downloadLogger: DataObject => Unit) = {

		val sourcesSource = Source(hashes.toList)
			.flatMapConcat{
				hash => Source.fromFuture(
					upload.lookupPackage(hash).andThen{
						case Failure(err) =>
							log.error(err, s"Could not retrieve metadata for ${hash.id}")
					}
				)
			}
			// Level-0 data should not be easily available, WDCGG (absent on disk) should be skipped
			//TODO Filter out third-party NetCDFs that have their own access URL
			.filter(dobj => dobj.specification.dataLevel > 0 && upload.getFile(dobj).exists)
			.map(dobj => (dobj.fileName, singleObjectSource(dobj, downloadLogger)))

		ZipEntryFlow.getMultiEntryZipStream(sourcesSource)
	}

	private def singleObjectSource(dobj: DataObject, downloadLogger: DataObject => Unit): Source[ByteString, NotUsed] = {
		val file = upload.getFile(dobj)

		val src = FileIO.fromPath(file.toPath).mapMaterializedValue(_.map(_.count))


		src.mapMaterializedValue(f => {
			f.onComplete{
				case Success(_) => downloadLogger(dobj)
				case Failure(err) => log.error(err, s"Access error for object ${dobj.hash.id} (${dobj.fileName})")
			}
			NotUsed
		})
	}
}
