package se.lu.nateko.cp.data.formats.simplesitescsv

import java.time.{ Instant, LocalDateTime, ZoneOffset }
import java.time.format.DateTimeFormatter

import akka.stream.scaladsl.Flow
import scala.concurrent.{ ExecutionContext, Future }

import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.meta.core.data.IngestionMetadataExtract

object SimpleSitesCsvStreams extends SimpleCsvStreams(","){

	private val isoLikeDateFormater = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")

	def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "NaN" || value == ""
		case _ => false
	}

	def makeTimeStamp(cells: Array[String]): Instant =
		LocalDateTime.parse(cells(0), isoLikeDateFormater).toInstant(ZoneOffset.ofHours(1))

}
