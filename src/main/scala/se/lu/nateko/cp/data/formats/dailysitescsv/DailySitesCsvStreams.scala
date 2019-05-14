package se.lu.nateko.cp.data.formats.dailysitescsv

import java.time.{ Instant, LocalDate, LocalTime, ZoneOffset }
import java.time.temporal.ChronoUnit

import akka.stream.scaladsl.Flow
import scala.concurrent.{ ExecutionContext, Future }

import se.lu.nateko.cp.data.formats._

object DailySitesCsvStreams extends SimpleCsvStreams(","){

	override def makeTimeStamp(cells: Array[String]): Instant = {
		val parsedTime = LocalDate.parse(cells(0)).atTime(LocalTime.MIN)
		parsedTime.toInstant(ZoneOffset.ofHours(1))
	}

	override def isNull(value: String, format: ValueFormat): Boolean = false

	override def acqIntervalTimeStep = Some(1L -> ChronoUnit.DAYS)

}
