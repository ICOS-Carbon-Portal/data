package se.lu.nateko.cp.data.services.upload

import akka.Done
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.utils.akka.done

import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

class FileSavingUploadTask(file: File)(using ExecutionContext) extends UploadTask:

	private val tmpFile: Path =
		val path = file.toPath
		path.resolveSibling(path.getFileName.toString + "_upload")

	def sink: Sink[ByteString, Future[UploadTaskResult]] =
		if(file.exists)
			Sink.cancelled.mapMaterializedValue(_ => Future.successful(FileExists))
		else
			val folder = file.getParentFile
			if(folder != null && !folder.exists) folder.mkdir()
			Files.deleteIfExists(tmpFile)
			FileIO.toPath(tmpFile).mapMaterializedValue(_.map(ioRes => FileWriteSuccess(ioRes.count)))

	def onComplete(
		ownResult: UploadTaskResult,
		otherTaskResults: Seq[UploadTaskResult]
	): Future[UploadTaskResult] = ownResult match

		case FileExists =>
			Future.successful(FileExists)

		case _ =>
			val relevantFailures: Seq[UploadTaskFailure] = otherTaskResults.collect{
				case failure: HashsumCheckFailure => Some(failure)
				case failure: UnexpectedTaskFailure => Some(failure)
				case failure: ByteCountingFailure => Some(failure)

				case ByteCountingSuccess(bytes) =>
					ownResult match
						case FileWriteSuccess(actualBytes) =>
							if bytes == actualBytes then None
							else
								val msg = s"Got $bytes bytes but written to disk only $actualBytes"
								Some(ByteCountingFailure(new CpDataException(msg)))
						case _ => None
			}.flatten

			if relevantFailures.isEmpty then ownResult match
				case _: FileWriteSuccess =>
					Files.move(tmpFile, file.toPath, StandardCopyOption.ATOMIC_MOVE)
				case _ => //do not finalize file writing if not full success

			UploadTask.revertOnAnyFailure(ownResult, relevantFailures, () => done)
