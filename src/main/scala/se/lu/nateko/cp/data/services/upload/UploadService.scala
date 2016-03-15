package se.lu.nateko.cp.data.services.upload

import java.nio.file.Paths
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.UserInfo
import se.lu.nateko.cp.data.UploadConfig
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.irods.IrodsClient
import se.lu.nateko.cp.data.streams.SinkCombiner
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.data.api.CpMetaVocab

class UploadService(config: UploadConfig, meta: MetaClient) {

	import meta.{system, dispatcher}
	import UploadService._

	val folder = new java.io.File(config.folder)

	if(!folder.exists) {
		assert(folder.mkdirs(), "Failed to create directory " + folder.getAbsolutePath)
	}
	assert(folder.isDirectory, "File storage service must be initialized with a directory path")

	private val irods = IrodsClient(config.irods)

	def getSink(hash: Sha256Sum, user: UserInfo): Future[Sink[ByteString, Future[UploadResult]]] = {
		for(
			dataObj <- meta.lookupPackage(hash);
			_ <- meta.userIsAllowedUpload(dataObj, user)
		) yield getSpecificSink(dataObj) //dataObj has a complete hash (not truncated)
	}

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

	private def getUploadTasks(dataObj: DataObject): IndexedSeq[UploadTask] = {
		val file = getFile(dataObj.hash)

		def hashAndIrods = IndexedSeq.empty :+
			new HashsumCheckingUploadTask(dataObj.hash) :+
			new IrodsUploadTask(dataObj.hash.id, irods)

		dataObj.specification.dataLevel match{
			case 0 =>
				hashAndIrods
			case 2 =>
				if(dataObj.specification.format.uri == CpMetaVocab.asciiWdcggTimeSer){
					IndexedSeq.empty :+
					new HashsumCheckingUploadTask(dataObj.hash) :+
					new IngestionUploadTask(dataObj, file, meta.sparql)
				}else {
					hashAndIrods :+
					new FileSavingUploadTask(file)
				}
			case 3 =>
				hashAndIrods :+
				new FileSavingUploadTask(file)
			case dataLevel =>
				IndexedSeq.empty :+
				new NotSupportedUploadTask(s"Upload of data objects of level $dataLevel is not supported")
		}
	}

	private def getPostUploadTasks(dataObj: DataObject): Seq[PostUploadTask] =
		Seq(new MetaCompletionPostUploadTask(dataObj.hash, meta))

}

object UploadService{
	type UploadTaskSink = Sink[ByteString, Future[UploadTaskResult]]
	type CombinedUploadSink = Sink[ByteString, Future[Seq[UploadTaskResult]]]

	def combineTaskSinks(sinks: Seq[UploadTaskSink])(implicit ctxt: ExecutionContext): CombinedUploadSink = {
		SinkCombiner.combineMat(sinks).mapMaterializedValue(Future.sequence(_))
	}
}
