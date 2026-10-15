package se.lu.nateko.cp.data.services.etcfacade

import akka.Done
import akka.NotUsed
import akka.event.LoggingAdapter
import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import org.slf4j.LoggerFactory
import se.lu.nateko.cp.data.EtcFacadeConfig
import se.lu.nateko.cp.data.api.ChecksumError
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.api.Utils.iterateChildren
import se.lu.nateko.cp.data.api.dataFail
import se.lu.nateko.cp.data.formats.TimeSeriesStreams
import se.lu.nateko.cp.data.formats.zip
import se.lu.nateko.cp.data.services.upload.HashsumCheckFailure
import se.lu.nateko.cp.data.services.upload.UploadResult
import se.lu.nateko.cp.data.services.upload.UploadAlreadyInProgress
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.ZipEntryFlow
import se.lu.nateko.cp.data.streams.ZipEntrySource
import se.lu.nateko.cp.data.utils.ErrorReporting
import se.lu.nateko.cp.data.utils.ErrorReporting.ErrorSite
import se.lu.nateko.cp.data.utils.akka.Debouncer
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.crypto.Md5Sum
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.etcupload.DataType
import se.lu.nateko.cp.meta.core.etcupload.EtcUploadMetadata
import se.lu.nateko.cp.meta.core.etcupload.StationId

import java.io.File
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.nio.file.StandardOpenOption
import java.nio.file.attribute.BasicFileAttributes
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success
import scala.util.Try
import scala.util.Using
import scala.util.control.NonFatal
import scala.util.control.NoStackTrace

/**
 * Encodes the behaviour and logic of the ETC logger data upload facade.
 * Main features:
 * 	- integrity control with MD5 checksums
 * 	- staging area for files uploaded from the loggers
 * 	- upload to CP, if the ETC metadata for the filename is available on the meta service
 * 	- packaging EC and PHEN half-hourly files into daily packages (zip archives)
 * 	- version handling in the case of re-uploads of files with the same filename
 * 	- automatic upload retries for all the files in staging
 *
 * EC and PHEN file packaging and submission is done in the following way.
 * 	1) If upon upload of a half-hourly file a certain daily package becomes complete (48 files for a particular station, logger, and file number),
 * and if no previous uploads of this daily package were performed, then the package is uploaded is triggered through a debouncer
 * with 10 minutes delay. Further potential half-hourly uploads for this package will debounce the upload. After a successful upload,
 * the half-hourly files are removed.
 * 	2) At {@code FacadeService.ForceEcUploadTime} time of day, all half-hourly EC files in staging are suplemented with latest
 * previously-uploaded files (if any, and only by files from half-hourly slots not represented in staging), packaged and uploaded.
 * Forced checks bypass the debounce delay, while remaining sequential and coordinated with live uploads.
 * Upon successful upload, the corresponding half-hourly files are purged unless replaced during the upload.
 * 	3) After the daily forced EC upload, files that are still in staging after {@code FacadeService.OldFileMaxAge}
 * (i.e. were never uploaded successfully) are moved to the station's quarantine folder, where they are no longer retried.
 * Test station files are deleted instead.
 *
 * Internal objects whose content does not match their registered hash sum are quarantined immediately,
 * as retrying their upload can never succeed.
 */
class FacadeService(val config: EtcFacadeConfig, upload: UploadService)(using mat: Materializer):
	import FacadeService._
	import mat.executionContext

	private val debouncer =
		val scheduler = upload.meta.system.scheduler
		Debouncer[EtcFilename, Done](10.minutes, scheduler)

	// Coordinate receipt and cleanup so an upload cannot delete a newly received replacement.
	private val stagingRevisions = new StagingRevisions

	private val metaClient = upload.meta
	private val log = upload.log
	private val structuredLog = LoggerFactory.getLogger(getClass)

	Files.createDirectories(Paths.get(config.folder))

	private[this] val retries = new RetryLogic(this, log).schedule()
	sys.addShutdownHook(retries.cancel())

	def getFilePath(file: EtcFilename) = getStationFolder(file.station).resolve(file.toString)
	def getStationFolder(station: StationId) = Paths.get(config.folder, station.id)

	def getObjectSource(station: StationId, hash: Sha256Sum): Path =
		getStationFolder(station).resolve(hash.id)

	def getFileSink(fn: EtcFilename, md5: Md5Sum): Sink[ByteString, Future[Done]] =
		val tmpPath = Files.createTempFile(fn.toString + ".", "")
		val targetFile = getFilePath(fn)
		Files.createDirectories(targetFile.getParent)

		def transactUpload(): Done =
			def move(): Unit = Files.move(tmpPath, targetFile, REPLACE_EXISTING): Unit
			if fn.toDaily.isDefined then stagingRevisions.replace(targetFile)(move())
			else move()
			Done

		val preprocessing: Flow[ByteString, ByteString, NotUsed] = fn.dataType match
			case DataType.SAHEAT =>
				TimeSeriesStreams.linesFromUtf8Binary.map{line =>
					val stationId = fn.station.hashCode
					ByteString(s"$line,$stationId\r\n" , ByteString.UTF_8)
				}
			case DataType.PHEN =>
				ZipEntryFlow.singleEntryUnzip
			case _ =>
				Flow.apply[ByteString]

		Flow.apply[ByteString]
			.viaMat(DigestFlow.md5)(Keep.right)
			.via(preprocessing)
			.toMat(FileIO.toPath(tmpPath)){
				(md5Fut, ioFut) => {
					for(
						md5Actual <- md5Fut;
						_ <- ioFut;
						done <- if(md5Actual == md5) Future(transactUpload()) else Future.failed(
							new ChecksumError(s"Expected MD5 checksum $md5, got $md5Actual")
						)
					) yield done
				}.andThen{
					case Success(_) =>
						logExternalUpload(fn)
						if fn.time.isDefined && fn.extension.equalsIgnoreCase("zip") then
							setLastModifiedFromZipContents(targetFile, log)

						performUploadIfNotTest(targetFile, fn, false)
					case Failure(_) => Files.deleteIfExists(tmpPath)
				}
			}
	end getFileSink

	def cleanupVeryOldFiles(station: StationId): Unit = stagingRevisions.synchronized{
		val expired = findExpiredFiles(getStationFolder(station), Instant.now())
		if station == config.testStation then expired.foreach(Files.deleteIfExists)
		else expired.foreach{file =>
			quarantine(station, file, "cleanup", "expired", s"not uploaded successfully within ${OldFileMaxAge.toDays} days")
		}
		stagingRevisions.forgetDeleted()
	}

	def logFilenameParseError(fileName: String, station: StationId, err: Throwable): Unit =
		val msg = Option(err.getMessage).getOrElse(err.toString)
		appendError(s"Invalid ETC upload filename from ${station.id}: $fileName : $msg")


	private[etcfacade] def performUploadIfNotTest(file: Path, fn: EtcFilename, forceDaily: Boolean): Future[Done] =
		if(fn.station == config.testStation) done else performUpload(file, fn, forceDaily)


	private def performUpload(file: Path, fn: EtcFilename, forceDaily: Boolean): Future[Done] =

		fn.toDaily.fold(performEtcUpload(file, fn, None)){ daily =>
			def packageAndUpload(): Future[Done] =
				inStage("package-daily", "lookup of previously uploaded half-hourly files failed"){
					getUploadedHalfHourlies(daily)
				}.flatMap{uploaded =>

					val stationFolder = getStationFolder(fn.station)
					val (fresh, revisions) = stagingRevisions.synchronized{
						val files = getZippableDailies(stationFolder, daily)
						val revisions = files.keysIterator.map{hhFn =>
							val path = stationFolder.resolve(hhFn.toString)
							path -> stagingRevisions.current(path)
						}.toMap
						files -> revisions
					}

					val filePackage = uploaded ++ fresh
					val isFullPackage: Boolean = packageIsComplete(filePackage)

					if !Files.exists(file) then done
					else if isFullPackage && uploaded.isEmpty || forceDaily && isFromBeforeToday(daily)
					then
						zipToArchive(filePackage, daily).flatMap{
							(zipFile, hash) =>
								if !uploaded.isEmpty then log.info(
									s"ETC facade will upload a new-version object $hash for daily file $daily"
								)
								performEtcUpload(zipFile, daily, Some(hash)).andThen{
									case Success(_) =>
										fresh.foreach{(hhFn, _) =>
											val hhFile = stationFolder.resolve(hhFn.toString)
											stagingRevisions.deleteIfUnchanged(hhFile, revisions(hhFile))
										}

									case Failure(_) =>
										Files.deleteIfExists(zipFile)
										val srcPath = getObjectSource(daily.station, hash)
										Files.deleteIfExists(srcPath)
								}
						}
					else done //no uploads for incomplete or previously incomplete packages, unless forced
				}
			if forceDaily then debouncer.runNow(daily)(packageAndUpload())
			else debouncer.debounce(daily)(packageAndUpload())
		}.andThen(handleErrors(fn.station, fn.toString))


	private def performEtcUpload(
		file: Path,
		fn: EtcFilename,
		hashOpt: Option[Sha256Sum],
	): Future[Done] = hashOpt
		.map(Future.successful)
		.getOrElse(FileIO
			.fromPath(file)
			.viaMat(DigestFlow.sha256)(Keep.right)
			.to(Sink.ignore)
			.run()
		)
		.map(getUploadMeta(fn, _))
		.flatMap(etcMeta =>
			inStage("register-upload", "ETC metadata registration failed"){
				metaClient.registerEtcUpload(etcMeta).map(_ => etcMeta)
			}
		)
		.flatMap{etcMeta =>
			val srcPath = getObjectSource(fn.station, etcMeta.hashSum)
			Files.move(file, srcPath, REPLACE_EXISTING)
			uploadDataObject(srcPath, fn.station, etcMeta.hashSum, UploadSource.Live)
		}

	private def uploadDataObject(srcPath: Path, station: StationId, hash: Sha256Sum, source: UploadSource): Future[Done] =
		structuredLog.atInfo()
			.addKeyValue("source", source.name)
			.addKeyValue("station", station.id)
			.addKeyValue("hash", hash.id)
			.addKeyValue("path", srcPath.getFileName)
			.log("ETC facade internal upload attempt")
		upload
		.getEtcSink(hash)
		.flatMap(FileIO.fromPath(srcPath).runWith)
		.flatMap{res =>
			res.makeReport.fold(
				errMsg =>
					val hashMismatch = res.taskResults.exists(_.isInstanceOf[HashsumCheckFailure])
					if hashMismatch && quarantine(
						station, srcPath, "internal-upload", "hash-mismatch", s"content does not match hash sum: $errMsg"
					)
					then Future.failed(new ObjectQuarantined(srcPath))
					else dataFail(errMsg),
				_ => done
			)
		}
		.transform(
			ok => {Files.delete(srcPath); ok},
			{
				case err: UploadAlreadyInProgress => err
				case err: ObjectQuarantined => err
				case err => new EtcStageFailure(
					"internal-upload",
					s"ETC facade failure during internal object upload. source=${source.name} station=$station, object $hash",
					err
				)
			}
		)

	private[etcfacade] def uploadDataObjectHandleErrors(station: StationId, hash: Sha256Sum): Future[Done] =
		val srcPath = getObjectSource(station, hash)
		uploadDataObject(srcPath, station, hash, UploadSource.Retry).andThen(
			handleErrors(station, hash.base64Url)
		)

	private def getUploadedHalfHourlies(daily: EtcFilename): Future[DailyPackage] =
		EtcFilename
			.dailyFileFormats
			.get(daily.dataType)
			.fold(
				Future.failed(CpDataException(s"Not a daily file: $daily"))
			)(dailyFormat =>
				metaClient.getSameFilenameInfo(daily.toString).map(
					_.sortBy(_.submissionEnd).foldLeft(Map.empty){(acc, sfi) =>
						if sfi.format != dailyFormat then acc
						else
							val zipFile = upload.getFile(Some(sfi.format), sfi.hash, true)
							val halfHourlies = zip.listEntries(zipFile).get
								.flatMap(zentry => EtcFilename.parse(zentry.getName).toOption.map(_ -> zentry))
								.collect{
									case (fn, zentry) if !acc.contains(fn) =>
										fn -> ZipEntrySource.fileEntry(zipFile, zentry)
								}
							acc ++ halfHourlies
					}
				)
			)

	private def appendError(msg: String): Unit = appendLogMsgToFile(msg, "errorLog.txt")
	private def logExternalUpload(fn: EtcFilename): Unit = appendLogMsgToFile(fn.toString, "externalUploadsLog.txt")

	private def appendLogMsgToFile(msg: String, fileName: String): Unit =
		try
			val msgFile = Paths.get(config.folder, fileName)
			val msgBytes = s"${Instant.now}\t$msg\n".getBytes(StandardCharsets.UTF_8)
			Files.write(msgFile, msgBytes, StandardOpenOption.APPEND, StandardOpenOption.CREATE)
		catch case NonFatal(err) =>
			log.error(err, s"Could not append ETC facade message to $fileName")

	/** Moves a staged file out of the retry loop, reporting it once. Returns false if the move failed. */
	private def quarantine(station: StationId, file: Path, operation: String, failure: String, reason: String): Boolean =
		try
			moveToQuarantine(file)
			val msg = s"Quarantined ${file.getFileName} from ${station.id}, no further retries: $reason"
			appendError(msg)
			log.warning(msg)
			ErrorReporting.report(
				new ObjectQuarantined(file),
				ErrorSite(SentryComponent, operation),
				ErrorReporting.Failure(failure, transient = false),
				groupBy = Seq("station" -> station.id),
				tags = Seq("file" -> file.getFileName.toString)
			)
			true
		catch case NonFatal(err) =>
			log.error(err, s"Could not quarantine ETC facade file $file")
			false

	private def handleErrors(station: StationId, uploadedObj: String): PartialFunction[Try[Done], Unit] =
		case Failure(_: UploadAlreadyInProgress) =>
			log.info(s"ETC facade upload for $uploadedObj is already in progress, skipping duplicate attempt")
		case Failure(_: ObjectQuarantined) =>
			() // already reported by quarantine()
		case Failure(err) =>
			val errMsg = UploadResult.extractMessage(err)
			appendError(s"Error while uploading $uploadedObj : $errMsg")
			// not log.error, which would make a second, ungrouped Sentry event via the logback appender
			log.warning(s"ETC facade error while uploading $uploadedObj : $errMsg")
			val failure = classifyFailure(err)
			ErrorReporting.report(
				err,
				ErrorSite(SentryComponent, stageOf(err).getOrElse("upload")),
				failure,
				// transient failures (e.g. meta unreachable) are not station-specific, so one issue for all stations
				groupBy = if failure.transient then Nil else Seq("station" -> station.id),
				tags = Seq("station" -> station.id, "file" -> uploadedObj)
			)

end FacadeService

object FacadeService:
	import ZipEntryFlow._

	type EtcFileInfo = (Path, EtcFilename)
	type DailyPackage = Map[EtcFilename, FileEntry]

	val ForceEcUploadTime = LocalTime.of(4, 0) //is to be interpreted as UTC time
	val OldFileMaxAge = Duration.ofDays(30)
	val QuarantineFolderName = "quarantine"

	private[etcfacade] final class ObjectQuarantined(file: Path)
		extends Exception(s"$file was quarantined") with NoStackTrace

	val SentryComponent = "etc-facade"

	/** Marks which step of the upload failed, for error reporting */
	private[etcfacade] final class EtcStageFailure(val operation: String, msg: String, cause: Throwable)
		extends Exception(msg, cause)

	private def inStage[T](operation: String, description: String)(fut: Future[T])(using ExecutionContext): Future[T] =
		fut.recoverWith{case NonFatal(err) => Future.failed(new EtcStageFailure(operation, description, err))}

	private def causeChain(err: Throwable): Iterator[Throwable] =
		Iterator.iterate(err)(_.getCause).takeWhile(_ != null).take(20)

	def stageOf(err: Throwable): Option[String] =
		causeChain(err).collectFirst{case stage: EtcStageFailure => stage.operation}

	def classifyFailure(err: Throwable): ErrorReporting.Failure =
		val metadataNotFound = causeChain(err).exists(
			e => Option(e.getMessage).exists(_.contains("Could not find ETC file metadata"))
		)
		if metadataNotFound then ErrorReporting.Failure("metadata-not-found", transient = false)
		else ErrorReporting.classify(err)

	private enum UploadSource(val name: String):
		case Live extends UploadSource("live")
		case Retry extends UploadSource("retry")

	def getUploadMeta(file: EtcFilename, hashSum: Sha256Sum) = EtcUploadMetadata(
		hashSum = hashSum,
		fileName = file.toString,
		station = file.station,
		logger = file.loggerNumber,
		dataType = file.dataType,
		fileId = file.fileNumber,

		acquisitionStart = file.time
			.map(LocalDateTime.of(file.date, _).minusMinutes(30))
			.getOrElse(LocalDateTime.of(file.date, LocalTime.MIN)),

		acquisitionStop = file.time
			.map(LocalDateTime.of(file.date, _))
			.getOrElse(LocalDateTime.of(file.date.plusDays(1), LocalTime.MIN))
	)

	private def getEtcFiles(folder: Path): Vector[EtcFileInfo] = iterateChildren(folder){_
		.flatMap(p => EtcFilename.parse(p.getFileName.toString).toOption.map((p, _)))
		.toVector
	}

	/** ETC files and internal objects (named by hash) that the retry logic picks up from a station folder */
	def isStagedFile(path: Path): Boolean =
		val name = path.getFileName.toString
		Files.isRegularFile(path) &&
			(EtcFilename.parse(name, true).isSuccess || Sha256Sum.fromBase64Url(name).isSuccess)

	def findExpiredFiles(folder: Path, now: Instant): Vector[Path] = iterateChildren(folder){_
		.filter(isStagedFile)
		.filter{path =>
			val created = Files.readAttributes(path, classOf[BasicFileAttributes]).creationTime().toInstant
			Duration.between(created, now).compareTo(OldFileMaxAge) > 0
		}
		.toVector
	}

	def moveToQuarantine(file: Path): Path =
		val folder = file.getParent.resolve(QuarantineFolderName)
		Files.createDirectories(folder)
		Files.move(file, folder.resolve(file.getFileName), REPLACE_EXISTING)

	def getZippableDailies(folder: Path, dailyFile: EtcFilename): DailyPackage =
		getEtcFiles(folder).collect{
			case (path, fn) if fn.toDaily.contains(dailyFile) =>
				fn -> ZipEntryFlow.entryFromFile(path)
		}.toMap

	def zipToArchive(files: DailyPackage, fn: EtcFilename)(using Materializer, ExecutionContext): Future[(Path, Sha256Sum)] =

		val tmpFile = Files.createTempFile(fn.toString, "")

		val fileEntries: Seq[FileEntry] = files.values.toSeq.sortBy(_._1.getName)

		val alreadyCompressed = fileEntries.forall{ (zentry, _) =>
			val ext = zentry.getName.split(".").lastOption.map(_.toLowerCase)
			ext.fold(false)(compressedExtensions.contains)
		}

		val compression: Option[Compression] = if(alreadyCompressed) Some(0) else None

		getMultiEntryZipStream(Source(fileEntries), compression)
			.viaMat(DigestFlow.sha256)(Keep.right)
			.toMat(FileIO.toPath(tmpFile))(Keep.both)
			.mapMaterializedValue{
				case (hashFut, ioFut) => {
					for(
						hash <- hashFut;
						_ <- ioFut
					) yield tmpFile -> hash
				}.andThen{
					case Failure(_) =>
						Files.deleteIfExists(tmpFile)
				}
			}
			.run()

	def setLastModifiedFromZipContents(zipFile: Path, log: LoggingAdapter): Unit =
		Using(zip.open(zipFile.toFile))(
			_.entries().nextElement().getLastModifiedTime
		)
		.map(Files.setLastModifiedTime(zipFile, _))
		.failed
		.foreach{
			log.error(_, "Could not set last modified date of the uploaded zip from its contents")
		}


	val compressedExtensions = Set("zip", "jpg", "jpeg", "gz")

	def isFromBeforeToday(fn: EtcFilename): Boolean = LocalDate.now(ZoneOffset.UTC).compareTo(fn.date) > 0

	private def packageIsComplete(pack: DailyPackage): Boolean =
		pack.keysIterator.flatMap(_.slot).toSet.size == 48

end FacadeService
