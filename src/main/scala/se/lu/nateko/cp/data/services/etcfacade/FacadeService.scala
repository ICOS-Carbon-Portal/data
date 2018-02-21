package se.lu.nateko.cp.data.services.etcfacade

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

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
import se.lu.nateko.cp.meta.core.etcupload.DataType
import se.lu.nateko.cp.meta.core.etcupload.EtcUploadMetadata
import se.lu.nateko.cp.meta.core.etcupload.StationId

class FacadeService(val config: EtcFacadeConfig, upload: UploadService)(implicit mat: Materializer) {
	import FacadeService._
	import mat.executionContext

	private val metaClient = upload.meta
	private val log = upload.log

	private[this] val retries = new RetryLogic(this, log).schedule()
	sys.addShutdownHook(retries.cancel())

	def getFilePath(file: EtcFilename) = Paths.get(config.folder, file.station.id, file.toString)
	def getStationFolder(station: StationId) = Paths.get(config.folder, station.id)
	def getObjectSource(station: StationId, hash: Sha256Sum): Path =
		getStationFolder(station).resolve(hash.id)

	def getFileSink(fn: EtcFilename, md5: Md5Sum): Sink[ByteString, Future[Done]] = {
		val tmpPath = Files.createTempFile(fn.toString + ".", "")
		val targetFile = getFilePath(fn)

		def transactUpload(): Done = {
			Files.createDirectories(targetFile.getParent)
			Files.move(tmpPath, targetFile, REPLACE_EXISTING)
			Done
		}

		Flow.apply[ByteString]
			.viaMat(DigestFlow.md5)(Keep.right)
			.toMat(FileIO.toPath(tmpPath)){(md5Fut, ioFut) =>

			(for(
				md5Actual <- md5Fut;
				ioRes <- ioFut;
				_ <- Future.fromTry(ioRes.status);
				done <- if(md5Actual == md5) Future(transactUpload()) else Future.failed(
					new ChecksumError(s"Expected MD5 checksum $md5, got $md5Actual")
				)
			) yield done).andThen{
				case Success(_) => performUpload(targetFile, fn)
				case Failure(_) => Files.deleteIfExists(tmpPath)
			}
		}
	}

	private[etcfacade] def performUpload(file: Path, fn: EtcFilename): Future[Done] = {
		if(fn.time.isDefined){
			val futSeq = getZippableDailyECs(getStationFolder(fn.station))
				.map{case (archiveFn, sources) =>

					val srcFiles = sources.map(getFilePath).sortBy(_.getFileName.toString)

					zipToArchive(srcFiles, archiveFn).flatMap{
						case (file, hash) => performEtcUpload(file, archiveFn, Some(hash))
					}
				}
			Future.sequence(futSeq).map(_ => Done)
		}
		else performEtcUpload(file, fn, None)
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
		.andThen{
			case Failure(err) =>
				//file can be a temp file outside the staging folder. If not, the next line is a noop.
				Files.move(file, getFilePath(fn), REPLACE_EXISTING)
				log.error(err, "ETC upload registration with meta service failed")
		}
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
		.andThen{
			case Failure(err) =>
				log.error(err, s"ETC facade failure during internal object upload. Station $station, object $hash")
			case Success(_) =>
				Files.delete(getObjectSource(station, hash))
		}

}

object FacadeService{

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

	case class HalfHourSlot(date: LocalDate, number: Int)

	def slot(file: EtcFilename): Option[HalfHourSlot] = file.time.map{time =>

		val middle = LocalDateTime.of(file.date, time).minusMinutes(15)

		val middleSecond = middle
			.toLocalTime
			.toSecondOfDay
			.toFloat

		HalfHourSlot(middle.toLocalDate, Math.round((middleSecond - 900) / 1800).toInt)
	}

	private class FileSlot(val file: EtcFilename, val slot: HalfHourSlot)
	private case class SlotGroup(date: LocalDate, loggerNumber: Int, fileNumber: Int)

	def getZippableDailyECs(stationFolder: Path): Map[EtcFilename, Vector[EtcFilename]] = iterateChildren(stationFolder){_
		.flatMap(p => EtcFilename.parse(p.getFileName.toString).toOption)
		.filter(f => f.time.isDefined && f.dataType == DataType.EC)
		.flatMap(f => slot(f).map(new FileSlot(f, _)))
		.toIterable
		.groupBy(fs => SlotGroup(fs.slot.date, fs.file.loggerNumber, fs.file.fileNumber))
		.collect{
			case (slotGroup, fileSlots) if(fileSlots.map(_.slot.number).toSet.size == 48) => //2 per hour for a day
				val archiveFile = fileSlots.head.file.copy( //head is sure to exist
					date = slotGroup.date,
					timeOrDatatype = Right(DataType.EC), // "illegal" EtcFilename with EC datatype but no time
					extension = "zip"
				)
				archiveFile -> fileSlots.map(_.file).toVector
		}
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
				case (hashFut, ioFut) =>
					val finalHashFut = for(
						hash <- hashFut;
						io <- ioFut;
						_ <- Future.fromTry(io.status)
					) yield tmpFile -> hash
					finalHashFut.failed.foreach( _ => Files.deleteIfExists(tmpFile))
					finalHashFut
			}
			.run()
	}
}
