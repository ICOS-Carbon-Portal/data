package se.lu.nateko.cp.data.services.upload

import java.io.FileNotFoundException
import java.nio.file.Files
import java.nio.file.Paths

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.Done
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.Uri
import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.UploadConfig
import se.lu.nateko.cp.data.api.{ CpMetaVocab, MetaClient }
import se.lu.nateko.cp.data.api.B2SafeClient
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.irods.IrodsClient
import se.lu.nateko.cp.data.streams.SinkCombiner
import se.lu.nateko.cp.data.NetCdfConfig
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data._
import Envri.Envri
import java.net.URI
import se.lu.nateko.cp.data.api.CpDataParsingException
import java.io.File

class UploadService(config: UploadConfig, netcdfConf: NetCdfConfig, val meta: MetaClient)(implicit mat: Materializer) {

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
	private val b2 = new B2SafeClient(config.b2safe, Http())

	def remoteStorageSourceExists(dataObj: DataObject): Boolean = irods2.fileExists(filePathSuffix(dataObj))

	def b2SafeSourceExists(format: Option[URI], hash: Sha256Sum): Future[Boolean] = b2
		.getHashsum(B2SafeUploadTask.irodsData(format, hash))
		.map(_.contains(hash))

	def getRemoteStorageSource(dataObj: DataObject): Source[ByteString, Future[Long]] =
		irods2.getFileSource(filePathSuffix(dataObj))

	def getRemoteStorageSource(format: Option[URI], hash: Sha256Sum): Source[ByteString, Future[Long]] =
		irods2.getFileSource(filePathSuffix(format, hash))

	def uploadToB2Stage(format: Option[URI], hash: Sha256Sum, src: Source[ByteString, Any]): Future[Done] =
		B2SafeUploadTask(format, hash, b2).uploadObject(src)

	def listIrodsFolder(path: String) = irods2.listFolderContents(path)

	def getSink(hash: Sha256Sum, user: UserId)(implicit envri: Envri): Future[DataObjectSink] = {
		for(
			dataObj <- meta.lookupPackage(hash);
			_ <- meta.userIsAllowedUpload(dataObj, user);
			sink <- getSpecificSink(dataObj) //dataObj has a complete hash (not truncated)
		) yield sink
	}

	def getTryIngestSink(objSpec: Uri, nRows: Option[Int], varnames: Option[Seq[String]])(implicit envri: Envri): Future[TryIngestSink] = {
		val origFile = Files.createTempFile("ingestionTest", null)
		Files.delete(origFile)
		meta.lookupObjSpec(objSpec).flatMap{spec =>
			val ingReq = new IngestRequest(origFile.toFile, spec, nRows, varnames)
			ingestionTaskFut(Left(ingReq))
		}.map{task =>

			def unpackTaskResult(taskRes: UploadTaskResult): Future[IngestionMetadataExtract] = taskRes match{
				case IngestionSuccess(metaExtract) =>
					Future.successful(metaExtract)
				case fail: UploadTaskFailure =>
					Future.failed(fail.error)
				case ok: UploadTaskSuccess =>
					task.onComplete(ok, Nil).flatMap(unpackTaskResult)
				case _ =>
					Future.failed(new CpDataException(s"Unexpected UploadTaskResult $taskRes"))
			}

			task.sink.mapMaterializedValue(
				_.flatMap(unpackTaskResult).andThen{
					case _ => Files.deleteIfExists(origFile)
				}
			)
		}.map{
			SinkCombiner.ignoreOnCancel
		}
	}

	def reingest(hash: Sha256Sum, user: UserId)(implicit envri: Envri): Future[Done] =
		for(
			obj <- meta.lookupPackage(hash);
			dataObj = obj.asDataObject.getOrElse{
				throw new CpDataException("Reingestion is only supported for DataObjects, not any StaticObjects")
			};
			_ <- meta.userIsAllowedUpload(dataObj, user);
			origFile = getFile(dataObj);
			ingTask <- {
				if(origFile.exists) ingestionTaskFut(Right(dataObj))
				else Future.failed(new FileNotFoundException(
					s"File for ${dataObj.hash} not found on the server, can not reingest"
				))
			};
			completionInfo <- FileIO.fromPath(origFile.toPath)
				.runWith(ingTask.sink)
				.flatMap(ownResult => ingTask.onComplete(ownResult, Nil))
				.transform{
					case Success(res: UploadTaskFailure) => Failure(res.error)
					case Success(IngestionSuccess(metaExtr)) =>
						Success(UploadCompletionInfo(origFile.length, Some(metaExtr)))
					case Success(taskRes) => Failure(new CpDataException(s"Unexpected UploadTaskResult $taskRes"))
					case Failure(err) => Failure(err)
				};
			_ <- meta.completeUpload(hash, completionInfo)
		) yield Done

	def getEtcSink(hash: Sha256Sum): Future[DataObjectSink] = {
		implicit val envri = Envri.ICOS
		meta.lookupPackage(hash).flatMap(getSpecificSink)
	}

	def getFile(dataObj: StaticObject) = Paths.get(folder.getAbsolutePath, filePathSuffix(dataObj)).toFile
	def getFile(format: Option[URI], hash: Sha256Sum) = Paths.get(folder.getAbsolutePath, filePathSuffix(format, hash)).toFile

	def getDownloadReporterPassword(username: String): Option[String] =
		if(config.dlReporter.username == username) Some(config.dlReporter.password) else None

	private def getSpecificSink(dataObj: StaticObject)(implicit envri: Envri): Future[DataObjectSink] = {
		val postTasks = getPostUploadTasks(dataObj)

		getUploadTasks(dataObj).map{tasks =>
			combineTaskSinks(tasks.map(_.sink)).mapMaterializedValue(_.flatMap(uploadResults => {
				val results = uploadResults.toIndexedSeq

				results.foreach{
					case fail: UploadTaskFailure =>
						log.error(fail.error, s"Upload failure for ${dataObj.fileName} (${dataObj.hash})")
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

	private def getUploadTasks(obj: StaticObject): Future[IndexedSeq[UploadTask]] = obj match {
		case dobj: DataObject => getDobjUploadTasks(dobj)
		case doc: DocObject =>
			Future.successful(defaultTasks(doc))
	}

	private def getDobjUploadTasks(dobj: DataObject): Future[IndexedSeq[UploadTask]] = {

		import dobj.{specification => spec}

		spec.dataLevel match{
			case 1 | 2 | 3 if (spec.datasetSpec.isDefined) =>
				ingestionTaskFut(Right(dobj)).map{ingestionTask =>
					(
						if(spec.format.uri == CpMetaVocab.ObjectFormats.asciiWdcggTimeSer) mandatoryTasks(dobj)
						else defaultTasks(dobj)
					) :+ ingestionTask
				}
			case 0 | 1 | 2 | 3 => Future.successful(defaultTasks(dobj))

			case dataLevel => Future.successful(
				IndexedSeq.empty :+
				new NotSupportedUploadTask(s"Upload of data objects of level $dataLevel is not supported")
			)
		}
	}

	private def ingestionTaskFut(req: Either[IngestRequest, DataObject]): Future[UploadTask] = {
		val spec: DataObjectSpec = req.fold(_.spec, _.specification)
		val specFormat: URI = spec.format.uri
		val file = req.fold(_.file, getFile)
		import CpMetaVocab.ObjectFormats._

		if(specFormat == netCdfSpatial) {
			val varNames: Seq[String] = req.fold(
				_.vars.toSeq.flatten,
				_.specificInfo.left.toOption.flatMap(_.variables).toSeq.flatten.map(_.label)
			)
			val isTryIngest = req.isLeft
			if(isTryIngest && varNames.isEmpty)
				Future.failed(new CpDataException("Ingestion pointless: no variable names provided for validation"))
			else
				Future.successful(new NetCdfStatsTask(varNames, file, netcdfConf, isTryIngest))

		} else if(spec.dataLevel <= 2) {
			val ingSpec = req.fold(
				ir => new IngestionSpec(spec, ir.nRows, spec.self.label, None),
				dobj => IngestionSpec(dobj)
			)
			IngestionUploadTask(ingSpec, file, meta)
		} else Future.failed(new CpDataParsingException(s"Could not find ingester for format $specFormat"))
	}

	private def mandatoryTasks(obj: StaticObject) = IndexedSeq(
		new HashsumCheckingUploadTask(obj.hash),
		new ByteCountingTask
	)

	private def defaultTasks(obj: StaticObject) = mandatoryTasks(obj) :+
		new IrodsUploadTask(obj, irods2) :+
		B2SafeUploadTask(obj, b2) :+
		new FileSavingUploadTask(getFile(obj))

	private def getPostUploadTasks(obj: StaticObject)(implicit envri: Envri): Seq[PostUploadTask] =
		Seq(new MetaCompletionPostUploadTask(obj.hash, meta))

}

object UploadService{
	type DataObjectSink = Sink[ByteString, Future[UploadResult]]
	type UploadTaskSink = Sink[ByteString, Future[UploadTaskResult]]
	type CombinedUploadSink = Sink[ByteString, Future[Seq[UploadTaskResult]]]
	type TryIngestSink = Sink[ByteString, Future[IngestionMetadataExtract]]

	class IngestRequest(val file: File, val spec: DataObjectSpec, val nRows: Option[Int], val vars: Option[Seq[String]])

	def fileName(hash: Sha256Sum): String = hash.id
	def fileName(obj: StaticObject): String = fileName(obj.hash)

	def fileFolder(format: Option[URI]): String = format.fold("documents")(_.toString.stripSuffix("/").split('/').last)

	def fileFolder(obj: StaticObject): String = fileFolder(obj match{
		case dobj: DataObject => Some(dobj.specification.format.uri)
		case _: DocObject => None
	})

	def filePathSuffix(obj: StaticObject): String = fileFolder(obj) + "/" + fileName(obj)
	def filePathSuffix(format: Option[URI], hash: Sha256Sum): String = fileFolder(format) + "/" + fileName(hash)

	def combineTaskSinks(sinks: Seq[UploadTaskSink])(implicit ctxt: ExecutionContext): CombinedUploadSink = {
		SinkCombiner.combineMat(sinks).mapMaterializedValue{uploadResultFuts =>
			val failProof = uploadResultFuts.map(_.recover{
				case err => UnexpectedTaskFailure(err)
			})
			Future.sequence(failProof)
		}
	}
}
