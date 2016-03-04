package se.lu.nateko.cp.data.services.upload

import java.io.File
import java.nio.file.Paths
import scala.concurrent.Future
import scala.util.Failure
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import akka.stream.scaladsl.FileIO
import se.lu.nateko.cp.data.irods.IrodsClient
import se.lu.nateko.cp.data.streams.ErrorSwallower
import se.lu.nateko.cp.data.api.Utils
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.cpauth.core.UserInfo
import se.lu.nateko.cp.meta.core.data.DataObject
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Broadcast
import akka.stream.SinkShape
import se.lu.nateko.cp.data.streams.SinkCombiner
import scala.concurrent.ExecutionContext

class UploadService(folder: File, irods: IrodsClient, meta: MetaClient) {

	import meta.dispatcher
	import UploadService._

	if(!folder.exists) {
		assert(folder.mkdirs(), "Failed to create directory " + folder.getAbsolutePath)
	}
	assert(folder.isDirectory, "File storage service must be initialized with a directory path")

	def getSink(hash: Sha256Sum, user: UserInfo): Future[Sink[ByteString, Future[UploadResult]]] = {
		for(
			dataObj <- meta.lookupPackage(hash);
			_ <- meta.userIsAllowedUpload(dataObj, user)
		) yield getSpecificSink(dataObj) //dataObj has a complete hash (not truncated)
	}

	//TODO Remove the following method
	def getFile(hash: Sha256Sum) = Paths.get(folder.getAbsolutePath, hash.id).toFile

	private def getSpecificSink(dataObj: DataObject): Sink[ByteString, Future[UploadResult]] = {
		val tasks = getUploadTasks(dataObj)
		val postTasks = getPostUploadTasks(dataObj)

		combineTaskSinks(tasks.map(_.sink)).mapMaterializedValue(_.flatMap(uploadResults => {
			val results = uploadResults.toIndexedSeq

			val taskResultFutures = tasks.indices.map(i => {
				val theTask = tasks(i)
				val ownResult = results(i)
				val otherTaskResults = results.indices.collect{
					case idx if(idx != i) => results(idx)
				}
				theTask.onComplete(ownResult, otherTaskResults)
			})

			for(
				taskResults <- Future.sequence(taskResultFutures);
				postTaskResults <- Future.sequence(postTasks.map(_.perform(taskResults)))
			) yield new UploadResult(taskResults ++ postTaskResults)
		}))
	}

	private def getUploadTasks(dataObj: DataObject): IndexedSeq[UploadTask] = ???

	private def getPostUploadTasks(dataObj: DataObject): Seq[PostUploadTask] =
		Seq(new MetaCompletionPostUploadTask(dataObj.hash, meta))

/*	private def getFileSavingSink(hash: Sha256Sum): Sink[ByteString, Future[String]] = {
		val file = getFile(hash)

		if(file.exists)
			//TODO Develop a proper workflow for re-submission, re-upload, etc
			Sink.cancelled.mapMaterializedValue(_ => meta.completeUpload(hash))
		else {
			val irodsSink = irods.getNewFileSink(hash.id)
			val fileSink = FileIO.toFile(file)

			ErrorSwallower[ByteString]()
				.alsoToMat(irodsSink)(Keep.both)
				.toMat(fileSink){ case ((upstreamFut, hashFut), nbytesFut) =>
	
					val uploadedBytesFut = for(
						_ <- Utils.waitForAll(hashFut, nbytesFut, upstreamFut);
						actualHash <- hashFut;
						nBytes <- nbytesFut
					) yield
						if(actualHash == hash) nBytes
						else throw new Exception(s"Got hashsum $actualHash, expected $hash")

					uploadedBytesFut.andThen{
						case Failure(_) => if(file.exists) file.delete()
					}.andThen{
						case Failure(_) => irods.deleteFile(hash.id)
					}.flatMap(_ => meta.completeUpload(hash))
				}
		}
	}*/
}

object UploadService{
	type UploadTaskSink = Sink[ByteString, Future[UploadTaskResult]]
	type CombinedUploadSink = Sink[ByteString, Future[Seq[UploadTaskResult]]]

	def combineTaskSinks(sinks: Seq[UploadTaskSink])(implicit ctxt: ExecutionContext): CombinedUploadSink = {
		SinkCombiner.combineMat(sinks).mapMaterializedValue(Future.sequence(_))
	}
}
