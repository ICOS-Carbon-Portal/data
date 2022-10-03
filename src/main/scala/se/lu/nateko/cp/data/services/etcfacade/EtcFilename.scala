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
	dataType: DataType,
	time: Option[LocalTime],
	loggerNumber: Int,
	fileNumber: Int,
	extension: String
){
	import DataType.*

	def toDaily: Option[EtcFilename] = time.filter(_ => EtcFilename.canBeDailyPackage(this.dataType)).map{time =>
		copy(
			date = LocalDateTime.of(date, time).minusMinutes(15).toLocalDate,
			time = None,
			extension = "zip"
		)
	}

	def slot: Option[Int] = time.map{time =>
		val middleSecond = LocalDateTime
			.of(date, time)
			.minusMinutes(15)
			.toLocalTime
			.toSecondOfDay
			.toFloat
		Math.round((middleSecond - 900) / 1800).toInt
	}

	override def toString = {
		val dateStr = date.format(EtcFilename.dateFormat)
		val timeStr = time.map(_.format(EtcFilename.timeFormat)).getOrElse("")
		f"${station.id}_${dataType}_$dateStr${timeStr}_L$loggerNumber%02d_F$fileNumber%02d.$extension"
	}
}

object EtcFilename{

	val pattern = raw"(.{6})_([A-Z]{2,6})_(\d+)_L(\d+)_F(\d+)\.(\w{3})".r
	val dateFormat = DateTimeFormatter.ofPattern("yyyyMMdd")
	val timeFormat = DateTimeFormatter.ofPattern("HHmm")
	val allowedExtensions = Set("csv", "zip", "bin", "dat", "txt", "jpg")

	def patch(fn: String): String =
		if fn.endsWith("_img.zip") && fn.contains("_EC_")
		then fn.replace("_EC_", "_PHEN_").replace("_img.zip", ".jpg")
		else fn

	def parse(fn: String, allowDailyArchives: Boolean = false): Try[EtcFilename] = Try(patch(fn) match{

		case pattern(stationStr, typeStr, dateTimeStr, loggerStr, fileStr, extension) =>

			if(!allowedExtensions.contains(extension))
				argExc("Illegal file extension " + extension)

			val station = stationStr match {
				case StationId(station) => station
				case _ => argExc("Wrong station id: " + stationStr)
			}

			val dataType = DataType.valueOf(typeStr)

			val date = LocalDate.parse(dateTimeStr.take(8), dateFormat)

			val timeStr = dateTimeStr.drop(8)

			val time = if(timeStr.isEmpty)
				if(canBeDailyPackage(dataType) && !allowDailyArchives) argExc("EC and PHEN filenames must contain time")
				None
			else
				if(!canBeDailyPackage(dataType)) argExc("Only EC and PHEN filenames can contain time")
				Some(LocalTime.parse(timeStr, timeFormat))


			EtcFilename(station, date, dataType, time, loggerStr.toInt, fileStr.toInt, extension)

		case _ =>
			argExc("Wrong file name format, expecting CC-###_##_YYYYMMDD_LLN_FFN.zzz")
	})

	def canBeDailyPackage(dt: DataType) = dt == DataType.EC || dt == DataType.PHEN

	private def argExc(msg: String) = throw new IllegalArgumentException(msg)
}
