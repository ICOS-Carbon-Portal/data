package se.lu.nateko.cp.data.services.etcfacade

import se.lu.nateko.cp.meta.core.etcupload._
import java.time.LocalDate
import java.time.LocalTime
import scala.util.Try
import java.time.format.DateTimeFormatter
import java.time.LocalDateTime

case class EtcFilename(
	station: StationId,
	date: LocalDate,
	timeOrDatatype: Either[LocalTime, DataType.Value],
	loggerNumber: Int,
	fileNumber: Int,
	text: String
){
	def dataType: DataType.Value = timeOrDatatype.fold(_ => DataType.EC, identity)
	override def toString = text
}

object EtcFilename{

	val pattern = raw"(.{6})_([A-Z]{2})_(\d+)_L(\d+)_F(\d+)\.(\w{3})".r
	val dateFormat = DateTimeFormatter.ofPattern("yyyyMMdd")
	val timeFormat = DateTimeFormatter.ofPattern("HHmm")
	val allowedExtensions = Set("csv", "zip", "bin", "dat")

	def parse(text: String): Try[EtcFilename] = Try(text match{

		case pattern(stationStr, typeStr, dateTimeStr, loggerStr, fileStr, extension) =>

			if(!allowedExtensions.contains(extension))
				argExc("Illegal file extension " + extension)

			val station = stationStr match {
				case StationId(station) => station
				case _ => argExc("Wrong station id: " + stationStr)
			}

			val dataType = DataType.withName(typeStr)

			val date = LocalDate.parse(dateTimeStr.take(8), dateFormat)

			val timeStr = dateTimeStr.drop(8)

			val timeOrDatatype = if(timeStr.isEmpty) {
				if(dataType == DataType.EC) argExc("EC filenames must contain time")
				Right(dataType)
			}else {
				if(dataType != DataType.EC) argExc("Only EC filenames can contain time")
				Left(LocalTime.parse(timeStr, timeFormat))
			}

			EtcFilename(station, date, timeOrDatatype, loggerStr.toInt, fileStr.toInt, text)

		case _ =>
			argExc("Wrong file name format, expecting CC-###_##_YYYYMMDD_LLN_FFN.zzz")
	})

	private def argExc(msg: String) = throw new IllegalArgumentException(msg)
}
