package se.lu.nateko.cp.data.services.etcfacade

import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.nio.file.StandardOpenOption
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.Done
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
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.crypto.Md5Sum
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.etcupload.EtcUploadMetadata
import se.lu.nateko.cp.meta.core.etcupload.StationId

class FacadeService(val config: EtcFacadeConfig, upload: UploadService)(implicit mat: Materializer) {
	import FacadeService._
	import mat.executionContext

	private val metaClient = upload.meta
	private val log = upload.log

	Files.createDirectories(Paths.get(config.folder))

	private[this] val retries = new RetryLogic(this, log).schedule()
	sys.addShutdownHook(retries.cancel())

	def getFilePath(file: EtcFilename) = getStationFolder(file.station).resolve(file.toString)
	def getFileUploadedPath(file: EtcFilename) = getStationUploadedFolder(file.station).resolve(file.toString)

	def getStationFolder(station: StationId) = Paths.get(config.folder, station.id)
	def getStationUploadedFolder(station: StationId) = getStationFolder(station).resolve("uploaded")

	def getObjectSource(station: StationId, hash: Sha256Sum): Path =
		getStationFolder(station).resolve(hash.id)

	def getFileSink(fn: EtcFilename, md5: Md5Sum): Sink[ByteString, Future[Done]] = {
		val tmpPath = Files.createTempFile(fn.toString + ".", "")
		val targetFile = getFilePath(fn)

		def transactUpload(): Done = {
			val uploadedPath = getFileUploadedPath(fn)
			Files.createDirectories(uploadedPath.getParent)
			Files.deleteIfExists(uploadedPath)
			Files.move(tmpPath, targetFile, REPLACE_EXISTING)
			Done
		}

		Flow.apply[ByteString]
			.viaMat(DigestFlow.md5)(Keep.right)
			.toMat(FileIO.toPath(tmpPath)){
				(md5Fut, ioFut) => {
					for(
						md5Actual <- md5Fut;
						ioRes <- ioFut;
						_ <- Future.fromTry(ioRes.status);
						done <- if(md5Actual == md5) Future(transactUpload()) else Future.failed(
							new ChecksumError(s"Expected MD5 checksum $md5, got $md5Actual")
						)
					) yield done
				}.andThen{
					case Success(_) => performUpload(targetFile, fn, false)
					case Failure(_) => Files.deleteIfExists(tmpPath)
				}
			}
	}

	def cleanupVeryOldFiles(station: StationId): Unit = {
		deleteOldEtcFiles(getStationFolder(station))
		deleteOldEtcFiles(getStationUploadedFolder(station))
	}

	private[etcfacade] def performUpload(file: Path, fn: EtcFilename, forceEc: Boolean): Future[Done] = (fn.toEcDaily match{
		case Some(daily) =>
			val fresh = getZippableDailyECs(getStationFolder(fn.station), daily)

			val uploadedFolder = getStationUploadedFolder(fn.station)
			Files.createDirectories(uploadedFolder)

			val uploaded = getZippableDailyECs(uploadedFolder, daily)

			val filePackage = fresh ++ uploaded
			val isFullPackage: Boolean = filePackage.size == 48

			if(isFullPackage || forceEc){

				val srcFiles = filePackage.sortBy(_.getFileName.toString)

				zipToArchive(srcFiles, daily).flatMap{
					case (file, hash) =>
						if(isFullPackage)
							filePackage.foreach(Files.deleteIfExists)
						else fresh.foreach{file =>
							val target = uploadedFolder.resolve(file.getFileName)
							Files.move(file, target, REPLACE_EXISTING)
						}
						performEtcUpload(file, daily, Some(hash))
				}
			} else Future.successful(Done)
		case None =>
			performEtcUpload(file, fn, None)
	}).andThen{
		case Failure(err) =>
			appendError(err.getMessage)
			log.error(err, "ETC facade error")
	}

	private def performEtcUpload(file: Path, fn: EtcFilename, hashOpt: Option[Sha256Sum]): Future[Done] = hashOpt
		.map(Future.successful)
		.getOrElse(FileIO
			.fromPath(file)
			.viaMat(DigestFlow.sha256)(Keep.right)
			.to(Sink.ignore)
			.run()
		)
		.map(getUploadMeta(fn, _))
		.flatMap(etcMeta => metaClient.registerEtcUpload(etcMeta).map(_ => etcMeta))
		.transform(identity, err => {
			//file can be a temp file outside the staging folder. If not, the next line is a noop.
			Files.move(file, getFilePath(fn), REPLACE_EXISTING)
			new Exception(s"ETC upload registration with meta service failed: ${err.getMessage}", err)
			err
		})
		.flatMap{etcMeta =>
			Files.move(file, getObjectSource(fn.station, etcMeta.hashSum), REPLACE_EXISTING)
			uploadDataObject(fn.station, etcMeta.hashSum)
		}

	private[etcfacade] def uploadDataObject(station: StationId, hash: Sha256Sum): Future[Done] = upload
		.getEtcSink(hash)
		.flatMap{sink =>
			val srcPath = getObjectSource(station, hash)
			FileIO.fromPath(srcPath).runWith(sink)
		}
		.flatMap{res =>
			res.makeReport.fold(
				errMsg => Future.failed(new CpDataException(errMsg)),
				_ => Future.successful(Done)
			)
		}
		.transform(
			ok => {Files.delete(getObjectSource(station, hash)); ok},
			err => new Exception(s"ETC facade failure during internal object upload. Station $station, object $hash", err)
		)

	private def appendError(msg: String): Unit = {
		val errFile = Paths.get(config.folder, "errorLog.txt")
		val msgBytes = s"${Instant.now}\t$msg\n".getBytes(StandardCharsets.UTF_8)
		Files.write(errFile, msgBytes, StandardOpenOption.APPEND, StandardOpenOption.CREATE)
	}
}

object FacadeService{

	val ForceEcUploadTime = LocalTime.of(4, 0)
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

	private def getEtcFiles(folder: Path): Vector[(Path,EtcFilename)] = iterateChildren(folder){_
		.flatMap(p => EtcFilename.parse(p.getFileName.toString).toOption.map((p, _)))
		.toVector
	}

	def deleteOldEtcFiles(folder: Path): Unit = {
		val now = LocalDateTime.now(ZoneOffset.UTC)

		getEtcFiles(folder).foreach{
			case (path, filename) =>
				val age = Duration.between(LocalDateTime.of(filename.date, LocalTime.MAX), now)
				if(age.compareTo(OldFileMaxAge) > 0) Files.deleteIfExists(path)
		}
	}

	def getZippableDailyECs(folder: Path, dailyFile: EtcFilename): Vector[Path] = getEtcFiles(folder).collect{
		case (path, fn) if fn.toEcDaily.contains(dailyFile) => path
	}

	def zipToArchive(files: Vector[Path], fn: EtcFilename)(implicit mat: Materializer, ctxt: ExecutionContext): Future[(Path, Sha256Sum)] = {
		import se.lu.nateko.cp.data.streams.ZipEntryFlow._

		val tmpFile = Files.createTempFile(fn.toString, "")

		val fileEntries: Vector[FileEntry] = files.map{file =>
			file.getFileName.toString -> FileIO.fromPath(file)
		}

		getMultiEntryZipStream(Source(fileEntries))
			.viaMat(DigestFlow.sha256)(Keep.right)
			.toMat(FileIO.toPath(tmpFile))(Keep.both)
			.mapMaterializedValue{
				case (hashFut, ioFut) => {
					for(
						hash <- hashFut;
						io <- ioFut;
						_ <- Future.fromTry(io.status)
					) yield tmpFile -> hash
				}.andThen{
					case Failure(_) =>
						Files.deleteIfExists(tmpFile)
				}
			}
			.run()
	}

}
