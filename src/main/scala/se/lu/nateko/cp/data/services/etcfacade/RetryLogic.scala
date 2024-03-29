package se.lu.nateko.cp.data.services.etcfacade

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Duration
import java.time.LocalTime
import java.time.ZoneOffset

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.concurrent.duration.FiniteDuration
import scala.concurrent.duration.NANOSECONDS
import scala.util.Try

import akka.Done
import akka.event.LoggingAdapter
import akka.stream.Materializer
import se.lu.nateko.cp.data.api.Utils.iterateChildren
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.etcupload.StationId

private class RetryLogic(facade: FacadeService, log: LoggingAdapter)(using mat: Materializer) {

	import RetryLogic._
	import mat.executionContext

	private val retry: Runnable = () => {

		val forcingDaily = withinHalfHour(nowUtc, FacadeService.ForceEcUploadTime)

		log.info("Retrying ETC logger facade uploads" + (if(forcingDaily) ", forcing daily 48-half-hourly-pack uploads" else ""))

		retryStuckFiles(forcingDaily).transformWith{
			case _ => retryStuckObjects()
		}.foreach{_ =>
			if(forcingDaily) getStations.foreach(facade.cleanupVeryOldFiles)
		}
	}

	def schedule() = {
		val timeToFirst = timeToNextTick(nowUtc, FacadeService.ForceEcUploadTime, RetryPeriod)
		if(timeToFirst > 1.hour) mat.scheduleOnce(1.minute, retry)
		mat.scheduleWithFixedDelay(timeToFirst, RetryPeriod, retry)
	}

	private def retryStuckFiles(forceDaily: Boolean): Future[Done] = retryEntities[EtcFilename](
		(_, filename) => EtcFilename.parse(filename, true),
		fn => fn.toDaily.getOrElse(fn),
		fn => facade.performUploadIfNotTest(facade.getFilePath(fn), fn, forceDaily),
		facade.getFilePath
	)

	private def retryStuckObjects(): Future[Done] = retryEntities(
		(station, filename) => Sha256Sum.fromBase64Url(filename).map(station -> _),
		identity,
		(facade.uploadDataObjectHandleErrors _).tupled,
		(facade.getObjectSource _).tupled
	)

	private def retryEntities[T](
		parser: (StationId, String) => Try[T],
		key: T => Any,
		singleJob: T => Future[Done],
		fileToCheck: T => Path
	): Future[Done] = {
		def retrySequentially(queue: List[T]): Future[Done] = queue match{
			case Nil =>
				done
			case first :: rest =>
				val firstJob = if(Files.exists(fileToCheck(first)))
					singleJob(first)
				else done
				firstJob.transformWith(_ => retrySequentially(rest))
		}

		val queue = getStations.flatMap(station => getStuckEntities(station, parser(station, _), key))
		retrySequentially(queue.toList)
	}

	private def getStations: Seq[StationId] = iterateChildren(Paths.get(facade.config.folder)){_
		.map(_.getFileName.toString)
		.collect{
			case StationId(id) => id
		}
		.toIndexedSeq
	}

	private def getStuckEntities[T](station: StationId, parser: String => Try[T], key: T => Any): Seq[T] =
		iterateChildren(facade.getStationFolder(station)){_
			.flatMap(path => parser(path.getFileName.toString).toOption)
			.toSeq
			.groupBy(key)
			.map((_,group) => group.head)
			.toIndexedSeq
		}
}

object RetryLogic{

	val RetryPeriod = 12.hours

	def nowUtc = LocalTime.now(ZoneOffset.UTC)

	def withinHalfHour(dt1: LocalTime, dt2: LocalTime): Boolean =
		Math.abs(Duration.between(dt1, dt2).getSeconds) < 1800

	def timeToNextTick(from: LocalTime, mustTickTime: LocalTime, interval: FiniteDuration): FiniteDuration = {
		val nanoDiff: Long = Duration.between(from, mustTickTime).toNanos
		val max: Long = if(nanoDiff >= 0) nanoDiff else nanoDiff + 3600L * 24 * 1000000000L
		val actualNanos = max % interval.toNanos
		FiniteDuration(actualNanos, NANOSECONDS)
	}
}

