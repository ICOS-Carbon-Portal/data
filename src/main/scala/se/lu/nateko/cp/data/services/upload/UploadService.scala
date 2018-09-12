package se.lu.nateko.cp.data.services.upload

import java.nio.file.Files
import java.nio.file.Paths

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.http.scaladsl.Http
import akka.http.scaladsl.model.Uri
import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.UploadConfig
import se.lu.nateko.cp.data.api.{ CpMetaVocab, MetaClient }
import se.lu.nateko.cp.data.api.B2StageClient
import se.lu.nateko.cp.data.irods.IrodsClient
import se.lu.nateko.cp.data.streams.SinkCombiner
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.EnvriConfig

class UploadService(config: UploadConfig, val meta: MetaClient)(implicit mat: Materializer) {

	import UploadService._
	import meta.{ dispatcher, system }

	val log = system.log
	val folder = new java.io.File(config.folder)

	if(!folder.exists) {
		assert(folder.mkdirs(), "Failed to create directory " + folder.getAbsolutePath)
	}
	assert(folder.isDirectory, "File storage service must be initialized with a directory path")

//	private val irods = IrodsClient(config.irods)
	private val irods2 = IrodsClient(config.irods2)
	private val b2 = new B2StageClient(config.b2stage, Http())

	def lookupPackage(hash: Sha256Sum)(implicit envri: Envri): Future[DataObject] = meta.lookupPackage(hash)

	def getRemoteStorageSource(dataObj: DataObject): Source[ByteString, Future[Long]] =
		irods2.getFileSource(filePathSuffix(dataObj))

	def getSink(hash: Sha256Sum, user: UserId)(implicit envri: Envri): Future[DataObjectSink] = {
		for(
			dataObj <- meta.lookupPackage(hash);
			_ <- meta.userIsAllowedUpload(dataObj, user);
			sink <- getSpecificSink(dataObj) //dataObj has a complete hash (not truncated)
		) yield sink
	}

	def getTryIngestSink(objSpec: Uri, nRows: Option[Int])(implicit envri: Envri): Future[DataObjectSink] =
		meta.lookupObjSpec(objSpec).flatMap{spec =>
			val ingSpec = IngestionSpec(spec, nRows, spec.self.label)
			val origFile = Files.createTempFile("ingestionTest", null)
			Files.delete(origFile)
			IngestionUploadTask(ingSpec, origFile.toFile, meta.sparql)
		}.map{task =>
			task.sink.mapMaterializedValue(_.map{taskRes =>
				Files.deleteIfExists(task.file.toPath)
				new UploadResult(Seq(taskRes))
			})
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

				results.foreach{
					case fail: UploadTaskFailure => log.error(fail.error, "Upload task failure")
					//TODO Remove following case when B2StageFailure is a failure again
					case B2StageFailure(err) => log.error(err, "B2STAGE backup")
					case _ =>
				}

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

	private def getUploadTasks(dataObj: DataObject): Future[IndexedSeq[UploadTask]] = {
		val file = getFile(dataObj)

		val defaults = IndexedSeq.empty :+
			new HashsumCheckingUploadTask(dataObj.hash) :+
			new ByteCountingTask

		val defaultsWithBackup = defaults :+ new IrodsUploadTask(dataObj, irods2) :+
			new B2StageUploadTask(dataObj, b2)// :+ new IrodsUploadTask(dataObj, irods)

		def saveToFile = new FileSavingUploadTask(file)
		val spec = dataObj.specification

		def ingest =
			if(spec.format.uri == CpMetaVocab.asciiWdcggTimeSer)
				IngestionUploadTask(dataObj, file, meta.sparql).map{ingestionTask =>
					defaults :+ ingestionTask
				}
			else
				IngestionUploadTask(dataObj, file, meta.sparql).map{ingestionTask =>
					defaultsWithBackup :+ ingestionTask :+ saveToFile
				}

		spec.dataLevel match{
			case 1 if (spec.datasetSpec.isDefined) => ingest
			case 2 => ingest
			case 0 | 1 | 3 => Future.successful(defaultsWithBackup :+ saveToFile)

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

	def fileName(dataObject: DataObject): String = dataObject.hash.id

	def fileFolder(dataObject: DataObject): String =
		dataObject.specification.format.uri.toString.stripSuffix("/").split('/').last

	def filePathSuffix(dataObject: DataObject): String =
		fileFolder(dataObject) + "/" + fileName(dataObject)

	def combineTaskSinks(sinks: Seq[UploadTaskSink])(implicit ctxt: ExecutionContext): CombinedUploadSink = {
		SinkCombiner.combineMat(sinks).mapMaterializedValue{uploadResultFuts =>
			val failProof = uploadResultFuts.map(_.recover{
				case err => UnexpectedTaskFailure(err)
			})
			Future.sequence(failProof)
		}
	}
}
