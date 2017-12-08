package se.lu.nateko.cp.data.services.etcfacade

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
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
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.crypto.Md5Sum
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.etcupload.DataType
import se.lu.nateko.cp.meta.core.etcupload.EtcUploadMetadata
import se.lu.nateko.cp.meta.core.etcupload.StationId

class FacadeService(config: EtcFacadeConfig, metaClient: MetaClient)(implicit mat: Materializer) {
	import mat.executionContext

	def getFileSink(file: EtcFilename, md5: Md5Sum): Sink[ByteString, Future[Done]] = {
		val tmpPath = Files.createTempFile(file.toString + ".", "")

		def transactUpload(): Done = {
			val path = getFilePath(file)
			Files.createDirectories(path.getParent)
			Files.move(tmpPath, path)
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
				case Success(_) => performUpload(file)
				case Failure(_) => Files.deleteIfExists(tmpPath)
			}
		}
	}

	private def performUpload(file: EtcFilename): Unit = {
		val log = metaClient.log
		getUploadMeta(file).flatMap(metaClient.registerEtcUpload).failed.foreach{err =>
			log.error(err, "ETC upload registration with meta service failed")
		}
	}

	def getFilePath(file: EtcFilename) = Paths.get(config.folder, file.station.id, file.toString)
	def getStationFolder(station: StationId) = Paths.get(config.folder, station.id)

	def getUploadMeta(file: EtcFilename): Future[EtcUploadMetadata] = FileIO
		.fromPath(getFilePath(file))
		.viaMat(DigestFlow.sha256)(Keep.right)
		.to(Sink.ignore)
		.run()
		.map(FacadeService.getUploadMeta(file, _))
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

	def getZippableDailyECs(stationFolder: Path): Map[EtcFilename, Vector[EtcFilename]] = {
		import scala.collection.JavaConverters._

		Files.newDirectoryStream(stationFolder).iterator.asScala
			.flatMap(p => EtcFilename.parse(p.getFileName.toString).toOption)
			.filter(_.dataType == DataType.EC) //not needed but good for code clarity
			.flatMap(f => slot(f).map(new FileSlot(f, _)))
			.toIterable
			.groupBy(fs => SlotGroup(fs.slot.date, fs.file.loggerNumber, fs.file.fileNumber))
			.collect{
				case (slotGroup, fileSlots) if(fileSlots.map(_.slot.number).toSet.size == 48) => //2 per hour for a day
					val archiveFile = fileSlots.head.file.copy( //head is sure to exist
						date = slotGroup.date,
						timeOrDatatype = Right(DataType.EC) // "illegal" EtcFilename with EC datatype but no time
					)
					archiveFile -> fileSlots.map(_.file).toVector
			}

	}

	def zipToArchive(files: Vector[Path], target: Path)(implicit mat: Materializer, ctxt: ExecutionContext): Future[Sha256Sum] = {
		import se.lu.nateko.cp.data.streams.ZipEntryFlow._

		val tmpFile = Files.createTempFile(target.getFileName.toString, "")

		val fileEntries: Vector[FileEntry] = files.map{file =>
			file.getFileName.toString -> FileIO.fromPath(file)
		}

		def transactArchival(): Future[Done] = Future{
			Files.move(tmpFile, target)
			files.foreach(Files.delete)
			Done
		}

		getMultiEntryZipStream(Source(fileEntries))
			.viaMat(DigestFlow.sha256)(Keep.right)
			.toMat(FileIO.toPath(tmpFile))(Keep.both)
			.mapMaterializedValue{
				case (hashFut, ioFut) =>
					val finalHashFut = for(
						hash <- hashFut;
						io <- ioFut;
						_ <- Future.fromTry(io.status);
						_ <- transactArchival()
					) yield hash
					finalHashFut.failed.foreach( _ => Files.deleteIfExists(tmpFile))
					finalHashFut
			}
			.run()
	}
}
