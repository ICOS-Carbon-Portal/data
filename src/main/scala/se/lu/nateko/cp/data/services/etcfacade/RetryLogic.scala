package se.lu.nateko.cp.data.services.etcfacade

import java.nio.file.Files
import java.nio.file.Paths

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Try

import akka.Done
import akka.event.LoggingAdapter
import akka.stream.Materializer
import se.lu.nateko.cp.data.api.Utils.iterateChildren
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.etcupload.StationId
import java.nio.file.Path

private class RetryLogic(facade: FacadeService, log: LoggingAdapter)(implicit mat: Materializer) {

	import mat.executionContext

	def schedule() = mat.schedulePeriodically(1.minute, 12.hours, () => {
		log.info("Retrying ETC logger facade uploads")
		retryStuckFiles().andThen{
			case _ => retryStuckObjects()
		}
	})

	private def retryStuckFiles(): Future[Done] = retryEntities[EtcFilename](
		(station, filename) => EtcFilename.parse(filename),
		fn => facade.performUpload(facade.getFilePath(fn), fn),
		facade.getFilePath
	)

	private def retryStuckObjects(): Future[Done] = retryEntities(
		(station, filename) => Sha256Sum.fromBase64Url(filename).map(station -> _),
		(facade.uploadDataObject _).tupled,
		(facade.getObjectSource _).tupled
	)

	private def retryEntities[T](
		parser: (StationId, String) => Try[T],
		singleJob: T => Future[Done],
		fileToCheck: T => Path
	): Future[Done] = {
		def retrySequentially(queue: List[T]): Future[Done] = queue match{
			case Nil =>
				Future.successful(Done)
			case first :: rest =>
				val firstJob = if(Files.exists(fileToCheck(first)))
					singleJob(first)
				else Future.successful(Done)
				firstJob.transformWith(_ => retrySequentially(rest))
		}

		val queue = getStations.flatMap(station => getStuckEntities(station, parser(station, _)))
		retrySequentially(queue.toList)
	}

	private def getStations: Seq[StationId] = iterateChildren(Paths.get(facade.config.folder)){_
		.map(_.getFileName.toString)
		.collect{
			case StationId(id) => id
		}
		.toIndexedSeq
	}

	private def getStuckEntities[T](station: StationId, parser: String => Try[T]): Seq[T] =
		iterateChildren(facade.getStationFolder(station)){_
			.flatMap(path => parser(path.getFileName.toString).toOption)
			.toIndexedSeq
		}
}
