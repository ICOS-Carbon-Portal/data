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
import se.lu.nateko.cp.data.EtcFacadeConfig
import se.lu.nateko.cp.data.api.ChecksumError
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.api.Utils.iterateChildren
import se.lu.nateko.cp.data.api.dataFail
import se.lu.nateko.cp.data.formats.TimeSeriesStreams
import se.lu.nateko.cp.data.formats.zip
import se.lu.nateko.cp.data.services.upload.UploadResult
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.ZipEntryFlow
import se.lu.nateko.cp.data.streams.ZipEntrySource
import se.lu.nateko.cp.data.utils.akka.Debouncer
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.data.formats.zip
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
 * Upon successful upload, the corresponding half-hourly files are purged from staging.
 * 	3) After the daily forced EC upload, old files (older than {@code FacadeService.OldFileMaxAge}) are purged from staging.
 */
class FacadeService(val config: EtcFacadeConfig, upload: UploadService)(using mat: Materializer):
	import FacadeService._
	import mat.executionContext

	private val debouncer =
		val scheduler = upload.meta.system.scheduler
		Debouncer[EtcFilename, Done](10.minutes, scheduler, "Daily package upload")

	private val metaClient = upload.meta
	private val log = upload.log

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
			Files.move(tmpPath, targetFile, REPLACE_EXISTING)
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

	def cleanupVeryOldFiles(station: StationId): Unit =
		deleteOldEtcFiles(getStationFolder(station))


	private[etcfacade] def performUploadIfNotTest(file: Path, fn: EtcFilename, forceDaily: Boolean): Future[Done] =
		if(fn.station == config.testStation) done else performUpload(file, fn, forceDaily)


	private def performUpload(file: Path, fn: EtcFilename, forceDaily: Boolean): Future[Done] =

		fn.toDaily.fold(performEtcUpload(file, fn, None)){ daily =>
			debouncer.debounce(daily){
				getUploadedHalfHourlies(daily).flatMap{uploaded =>

					val stationFolder = getStationFolder(fn.station)
					val fresh = getZippableDailies(stationFolder, daily)

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
											Files.deleteIfExists(hhFile)
										}

									case Failure(_) =>
										Files.deleteIfExists(zipFile)
										val srcPath = getObjectSource(daily.station, hash)
										Files.deleteIfExists(srcPath)
								}
						}
					else done //no uploads for incomplete or previously incomplete packages, unless forced
				}
			}
		}.andThen(handleErrors(fn.toString))


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
		.flatMap(etcMeta => metaClient.registerEtcUpload(etcMeta).map(_ => etcMeta))
		.flatMap{etcMeta =>
			val srcPath = getObjectSource(fn.station, etcMeta.hashSum)
			Files.move(file, srcPath, REPLACE_EXISTING)
			uploadDataObject(srcPath, fn.station, etcMeta.hashSum)
		}

	private def uploadDataObject(srcPath: Path, station: StationId, hash: Sha256Sum): Future[Done] = upload
		.getEtcSink(hash)
		.flatMap(FileIO.fromPath(srcPath).runWith)
		.flatMap{res =>
			res.makeReport.fold(
				errMsg => dataFail(errMsg),
				_ => done
			)
		}
		.transform(
			ok => {Files.delete(srcPath); ok},
			err => new Exception(s"ETC facade failure during internal object upload. Station $station, object $hash", err)
		)

	private[etcfacade] def uploadDataObjectHandleErrors(station: StationId, hash: Sha256Sum): Future[Done] =
		val srcPath = getObjectSource(station, hash)
		uploadDataObject(srcPath, station, hash).andThen(
			handleErrors(hash.base64Url)
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

	private def appendLogMsgToFile(msg: String, fileName: String): Unit = {
		val msgFile = Paths.get(config.folder, fileName)
		val msgBytes = s"${Instant.now}\t$msg\n".getBytes(StandardCharsets.UTF_8)
		Files.write(msgFile, msgBytes, StandardOpenOption.APPEND, StandardOpenOption.CREATE)
	}

	private def handleErrors(uploadedObj: String): PartialFunction[Try[Done], Unit] =
		case Failure(err) =>
			appendError(s"Error while uploading $uploadedObj : " + UploadResult.extractMessage(err))
			log.error(err, s"ETC facade error while uploading $uploadedObj")

end FacadeService

object FacadeService:
	import ZipEntryFlow._

	type EtcFileInfo = (Path, EtcFilename)
	type DailyPackage = Map[EtcFilename, FileEntry]

	val ForceEcUploadTime = LocalTime.of(4, 0) //is to be interpreted as UTC time
	val OldFileMaxAge = Duration.ofDays(30)

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

	private def deleteOldEtcFiles(folder: Path): Unit =
		val now = Instant.now()
		getEtcFiles(folder).foreach: (path, filename) =>
			val fileLmt = Files.getLastModifiedTime(path).toInstant
			val age = Duration.between(fileLmt, now)
			if(age.compareTo(OldFileMaxAge) > 0) Files.deleteIfExists(path)

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
