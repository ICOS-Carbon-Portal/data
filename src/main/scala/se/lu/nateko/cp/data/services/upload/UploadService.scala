package se.lu.nateko.cp.data.services.upload

import java.nio.file.Paths

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.UploadConfig
import se.lu.nateko.cp.data.api.{ CpMetaVocab, MetaClient }
import se.lu.nateko.cp.data.api.CpInstVocab
import se.lu.nateko.cp.data.irods.IrodsClient
import se.lu.nateko.cp.data.streams.SinkCombiner
import se.lu.nateko.cp.meta.core.EnvriConfig
import se.lu.nateko.cp.meta.core.MetaCoreConfig.EnvriConfigs
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.Envri.Envri

class UploadService(config: UploadConfig, val meta: MetaClient, envriConfs: EnvriConfigs) {

	import UploadService._
	import meta.{ dispatcher, system }

	val log = system.log
	val folder = new java.io.File(config.folder)

	if(!folder.exists) {
		assert(folder.mkdirs(), "Failed to create directory " + folder.getAbsolutePath)
	}
	assert(folder.isDirectory, "File storage service must be initialized with a directory path")

	private val irods = IrodsClient(config.irods)
	private val irods2 = IrodsClient(config.irods2)
//	private val b2 = new B2StageClient(config.b2stage, Http())

	private implicit def getEnvriConfig(implicit envri: Envri): EnvriConfig = {
		envriConfs.getOrElse(envri, throw new Exception(s"Did not find config for ENVRI $envri"))
	}

	def lookupPackage(hash: Sha256Sum)(implicit envri: Envri): Future[DataObject] = meta.lookupPackage(hash)

	def getRemoteStorageSource(dataObj: DataObject): Source[ByteString, Future[Long]] =
		irods.getFileSource(filePathSuffix(dataObj))

	def getSink(hash: Sha256Sum, user: UserId)(implicit envri: Envri): Future[DataObjectSink] = {
		for(
			dataObj <- meta.lookupPackage(hash);
			_ <- meta.userIsAllowedUpload(dataObj, user);
			sink <- getSpecificSink(dataObj) //dataObj has a complete hash (not truncated)
		) yield sink
	}

	def getEtcSink(hash: Sha256Sum): Future[DataObjectSink] = {
		implicit val envri = Envri.ICOS
		meta.lookupPackage(hash).flatMap(getSpecificSink)
	}

	def getFile(dataObj: DataObject) = Paths.get(folder.getAbsolutePath, filePathSuffix(dataObj)).toFile

	private def getSpecificSink(dataObj: DataObject)(implicit envri: Envri): Future[DataObjectSink] = {
		val postTasks = getPostUploadTasks(dataObj)

		getUploadTasks(dataObj).map{tasks =>
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
	}

	private def getUploadTasks(dataObj: DataObject)(implicit  envri: Envri): Future[IndexedSeq[UploadTask]] = {
		val file = getFile(dataObj)

		//val b2Fut = B2StageUploadTask(dataObj, b2)

		val defaults = IndexedSeq.empty :+
			new HashsumCheckingUploadTask(dataObj.hash) :+
			new ByteCountingTask

		val defaultsWithBackupFut = Future.successful(()).map{_ =>
			defaults :+ new IrodsUploadTask(dataObj, irods) :+ new IrodsUploadTask(dataObj, irods2)
		}

		def saveToFile = new FileSavingUploadTask(file)
		val spec = dataObj.specification
		val specUri = spec.self.uri

		def ingest =
			if(spec.format.uri == CpMetaVocab.asciiWdcggTimeSer)
				IngestionUploadTask(dataObj, file, meta.sparql).map{ingestionTask =>
					defaults :+ ingestionTask
				}
			else
				IngestionUploadTask(dataObj, file, meta.sparql).flatMap{ingestionTask =>
					defaultsWithBackupFut.map(_ :+ ingestionTask :+ saveToFile)
				}

		spec.dataLevel match{
			case 1 if (specUri == CpInstVocab.atcCo2Nrt || specUri == CpInstVocab.atcCh4Nrt) => ingest
			case 2 => ingest
			case 0 | 1 | 3 => defaultsWithBackupFut.map(_ :+ saveToFile)

			case dataLevel => Future.successful(
				IndexedSeq.empty :+
				new NotSupportedUploadTask(s"Upload of data objects of level $dataLevel is not supported")
			)
		}
	}

	private def getPostUploadTasks(dataObj: DataObject)(implicit envri: Envri): Seq[PostUploadTask] =
		Seq(new MetaCompletionPostUploadTask(dataObj.hash, meta))

}

object UploadService{
	type DataObjectSink = Sink[ByteString, Future[UploadResult]]
	type UploadTaskSink = Sink[ByteString, Future[UploadTaskResult]]
	type CombinedUploadSink = Sink[ByteString, Future[Seq[UploadTaskResult]]]

	def filePathSuffix(dataObject: DataObject): String = {
		fileFolder(dataObject) + "/" + dataObject.hash.id
	}

	def fileFolder(dataObject: DataObject): String = {
		dataObject.specification.format.uri.toString.stripSuffix("/").split('/').last
	}

	def combineTaskSinks(sinks: Seq[UploadTaskSink])(implicit ctxt: ExecutionContext): CombinedUploadSink = {
		SinkCombiner.combineMat(sinks).mapMaterializedValue{uploadResultFuts =>
			val failProof = uploadResultFuts.map(_.recover{
				case err => UnexpectedTaskFailure(err)
			})
			Future.sequence(failProof)
		}
	}
}
