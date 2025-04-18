package se.lu.nateko.cp.data.services.upload

import akka.actor.Scheduler
import akka.Done
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.Uri
import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.NetCdfConfig
import se.lu.nateko.cp.data.UploadConfig
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.api.CpMetaVocab.ObjectFormats
import se.lu.nateko.cp.data.api.IRODSClient
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.api.dataFail
import se.lu.nateko.cp.data.streams.SinkCombiner
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.*

import java.io.File
import java.io.FileNotFoundException
import java.net.URI
import java.nio.file.Files
import java.nio.file.Paths
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

class UploadService(config: UploadConfig, netcdfConf: NetCdfConfig, val meta: MetaClient)(using Materializer) {

	import UploadService.*
	import ObjectFormats.{isNonIngestedZip, isNetCdf, netCdfTimeSer}
	import meta.{ dispatcher, system }
	given Scheduler = system.scheduler

	val log = system.log
	val folder = File(config.folder)
	private val readonlyFolder: Option[File] = config.readonlyFolder.map(new File(_))

	private[this] val objLock = new ObjectLock("is currently already being uploaded")

	if(!folder.exists) {
		assert(folder.mkdirs(), "Failed to create directory " + folder.getAbsolutePath)
	}
	assert(folder.isDirectory, "File storage service must be initialized with a directory path")

	private val irods = new IRODSClient(config.irods, Http())

	def remoteSourceExists(format: Option[URI], hash: Sha256Sum)(using Envri): Future[Boolean] = irods
		.getHashsumOpt(IrodsUploadTask.irodsData(format, hash))
		.map(_.contains(hash))

	def getRemoteStorageSource(format: Option[URI], hash: Sha256Sum)(using Envri): Source[ByteString, Future[Any]] =
		val srcFut = irods.downloadObject(IrodsUploadTask.irodsData(format, hash))
		Source.lazyFutureSource(() => srcFut)

	def uploadToRemoteStorage(format: Option[URI], hash: Sha256Sum, src: Source[ByteString, Any])(using Envri): Future[Done] =
		val sink = IrodsUploadTask(format, hash, irods).sink.mapMaterializedValue:
			_.flatMap:
				case f: UploadTaskFailure => Future.failed(f.error)
				case _ => Future.successful(Done)
		src.runWith(sink)

	def getSink(hash: Sha256Sum, user: UserId)(using Envri): Future[DataObjectSink] = {
		for(
			dObj <- meta.lookupObject(hash);
			_ <- meta.userIsAllowedUpload(dObj, user);
			sink <- getSpecificSink(dObj) //dObj has a complete hash (not truncated)
		) yield sink
	}

	def getTryIngestSink(objSpec: Uri, nRows: Option[Int], varnames: Option[Seq[String]])(implicit envri: Envri): Future[TryIngestSink] = {
		val origFile = Files.createTempFile("ingestionTest", null)
		Files.delete(origFile)
		meta.lookupObjSpec(objSpec).flatMap{spec =>
			val ingReq = new IngestRequest(origFile.toFile, spec, nRows, varnames)
			ingestionTaskFut(Left(ingReq))
		}.map{task =>

			def unpackTaskResult(depth: Int)(taskRes: UploadTaskResult): Future[IngestionMetadataExtract | String] = taskRes match{
				case IngestionSuccess(metaExtract) =>
					Future.successful(metaExtract)
				case fail: UploadTaskFailure =>
					Future.failed(fail.error)
				case ok: UploadTaskSuccess if depth < 3 =>
					task.onComplete(ok, Nil).flatMap(unpackTaskResult(depth + 1))
				case DummySuccess =>
					Future.successful("Ingestion try was a success")
				case _ =>
					dataFail(s"Unexpected UploadTaskResult $taskRes")
			}

			task.sink.mapMaterializedValue(
				_.flatMap(unpackTaskResult(0)).andThen{
					case _ => Files.deleteIfExists(origFile)
				}
			)
		}.map{
			SinkCombiner.ignoreOnCancel
		}
	}

	def reingest(hash: Sha256Sum, user: UserId)(implicit envri: Envri): Future[Done] =
		for(
			obj <- meta.lookupObject(hash);
			dataObj = obj.asDataObject.getOrElse{
				throw new CpDataException("Reingestion is only supported for DataObjects, not any StaticObjects")
			};
			_ <- meta.userIsAllowedUpload(dataObj, user);
			origFile = getFile(dataObj, false);
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
		meta.lookupObject(hash).flatMap(getSpecificSink)
	}

	def getFile(dataObj: StaticObject, fallbackToReadonlyIfNotExists: Boolean): File =
		filePicker(fallbackToReadonlyIfNotExists){ folder =>
			Paths.get(folder.getAbsolutePath, filePathSuffix(dataObj)).toFile
		}

	def getFile(format: Option[URI], hash: Sha256Sum, fallbackToReadonlyIfNotExists: Boolean): File =
		filePicker(fallbackToReadonlyIfNotExists){ folder =>
			Paths.get(folder.getAbsolutePath, filePathSuffix(format, hash)).toFile
		}

	private def filePicker(fallbackToReadonlyIfNotExists: Boolean)(folderToFile: File => File): File =
		val writeable = folderToFile(folder)
		if ! fallbackToReadonlyIfNotExists || writeable.exists() then writeable
		else readonlyFolder.fold(writeable)(folderToFile)

	def getDownloadReporterPassword(username: String): Option[String] =
		if(config.dlReporter.username == username) Some(config.dlReporter.password) else None

	def unlockUpload(hash: Sha256Sum): Done = objLock.unlock(hash)

	private def getSpecificSink(dObj: StaticObject)(implicit envri: Envri): Future[DataObjectSink] =
		for(
			tasks <- getUploadTasks(dObj);
			_ <- Future.fromTry{
				val lock = objLock.lock(dObj.hash)
				log.debug(s"Locking ${dObj.hash} for uploads...${if(lock.isSuccess) "OK" else "Problem!"}")
				lock
			}
		) yield {
			combineTaskSinks(tasks.map(_.sink)).mapMaterializedValue(_.flatMap(uploadResults => {
				val results = uploadResults.toIndexedSeq

				results.foreach{
					case fail: UploadTaskFailure =>
						log.error(fail.error, s"Upload failure for ${dObj.fileName} (${dObj.hash.id})")
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

				val resFut = for(
					taskResults <- Future.sequence(taskResultFutures);
					postResultFuts = getPostUploadTasks(dObj).map(_.perform(taskResults));
					postTaskResults <- Future.sequence(postResultFuts)
				) yield new UploadResult(taskResults ++ postTaskResults)

				resFut.andThen{
					case _ =>
						log.debug(s"Unlocking future uploads of ${dObj.hash} (getSpecificSink...resFut.andThen)")
						unlockUpload(dObj.hash)
				}
			}))
		}

	private def getUploadTasks(obj: StaticObject)(using Envri): Future[IndexedSeq[UploadTask]] = obj match {
		case dobj: DataObject => getDobjUploadTasks(dobj)
		case doc: DocObject =>
			Future.successful(defaultTasks(doc))
	}

	private def getDobjUploadTasks(dobj: DataObject)(using Envri): Future[IndexedSeq[UploadTask]] =
		import dobj.{specification => spec}

		if spec.dataLevel < 0 || spec.dataLevel > 3 then
			Future.successful(
				IndexedSeq.empty :+
				new NotSupportedUploadTask(s"Upload of data objects of level ${spec.dataLevel} is not supported")
			)
		else ingestionTaskFut(Right(dobj)).map{ingestionTask =>
			defaultTasks(dobj) :+ ingestionTask
		}

	private def ingestionTaskFut(req: Either[IngestRequest, DataObject]): Future[UploadTask] =
		val spec: DataObjectSpec = req.fold(_.spec, _.specification)
		val file = req.fold(_.file, getFile(_, false))
		val isTryIngest = req.isLeft

		if spec.datasetSpec.isEmpty then
			if isNonIngestedZip(spec.format.self.uri) then
				Future.successful(new ZipValidatingUploadTask)
			else if isNetCdf(spec.format.self.uri) then
				Future.successful(new NetCdfValidatingUploadTask)
			else
				if isTryIngest then
					dataFail(s"Data obj spec ${spec.self.uri} has no dataset spec, cannot ingest it")
				else
					Future.successful(DummyNoopTask)
		else if spec.specificDatasetType == DatasetType.SpatioTemporal then
			val varNames: Seq[String] = req.fold(
				_.vars.toSeq.flatten,
				_.specificInfo.left.toOption.flatMap(_.variables).toSeq.flatten.map(_.label)
			)
			if isTryIngest && varNames.isEmpty then
				dataFail("Ingestion pointless: no variable names provided for validation")
			else
				Future.successful(new NetCdfStatsTask(varNames, file, netcdfConf, isTryIngest))

		else if spec.format.self.uri == netCdfTimeSer && spec.specificDatasetType == DatasetType.StationTimeSeries then
			IngestionUploadTask.getColumnFormats(spec.self.uri, meta.sparql).map{colsMeta =>
				val submEnd = req.toOption.flatMap(_.submission.stop)
				ObspackNetCdfIngestionTask(file.toPath, colsMeta, isTryIngest, submEnd)
			}

		else if spec.specificDatasetType == DatasetType.StationTimeSeries then
			val ingSpec = req.fold(
				ir => new IngestionSpec(spec, ir.nRows, None, Some(0)),// time zone offset is arbitrary for trying ingestion
				dobj => IngestionSpec(dobj)
			)
			IngestionUploadTask.apply(ingSpec, file.toPath, meta)

		else
			dataFail(s"Could not find ingester for data obj spec ${spec.self.uri}")

	private def mandatoryTasks(obj: StaticObject) = IndexedSeq(
		new HashsumCheckingUploadTask(obj.hash),
		new ByteCountingTask
	)

	private def defaultTasks(obj: StaticObject)(using Envri) = mandatoryTasks(obj) :+
		//B2SafeUploadTask(obj, b2) :+
		IrodsUploadTask(obj, irods) :+
		new FileSavingUploadTask(getFile(obj, false))

	private def getPostUploadTasks(obj: StaticObject)(implicit envri: Envri): Seq[PostUploadTask] =
		Seq(new MetaCompletionPostUploadTask(obj.hash, meta))

}

object UploadService{
	type DataObjectSink = Sink[ByteString, Future[UploadResult]]
	type UploadTaskSink = Sink[ByteString, Future[UploadTaskResult]]
	type CombinedUploadSink = Sink[ByteString, Future[Seq[UploadTaskResult]]]
	type TryIngestSink = Sink[ByteString, Future[IngestionMetadataExtract | String]]

	class IngestRequest(val file: File, val spec: DataObjectSpec, val nRows: Option[Int], val vars: Option[Seq[String]])

	def fileName(hash: Sha256Sum): String = hash.id
	def fileName(obj: StaticObject): String = fileName(obj.hash)

	def fileFolder(format: Option[URI]): String = format.fold("documents")(_.toString.stripSuffix("/").split('/').last)

	def fileFolder(obj: StaticObject): String = fileFolder(obj match{
		case dobj: DataObject => Some(dobj.specification.format.self.uri)
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
