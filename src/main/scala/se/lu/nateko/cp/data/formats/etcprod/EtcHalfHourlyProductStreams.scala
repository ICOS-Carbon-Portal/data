package se.lu.nateko.cp.data.formats.etcprod

import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

import se.lu.nateko.cp.data.formats._

class EtcHalfHourlyProductStreams(utcOffset: Int) extends SimpleCsvStreams(","){

	override def isNull(value: String, format: ValueFormat): Boolean = format match {
		case FloatValue => value == "-9999"
		case _ => false
	}

	override def makeTimeStamp(cells: Array[String]): Instant = {
		//Averaging period's end
		LocalDateTime.parse(cells(1), ValueFormatParser.etcDateTimeFormatter).toInstant(ZoneOffset.ofHours(utcOffset))
	}

	override def acqIntervalTimeStep = Some(-30L -> ChronoUnit.MINUTES)
}
