package se.lu.nateko.cp.data.formats

import java.time.LocalDate
import java.time.LocalTime
import java.time.LocalDateTime
import java.time.ZoneOffset

abstract class DateColTimeColTimeSeriesToBinTableConverter(colFormats: ColumnFormats, columnNames: Array[String], offsetFromUtc: Int, nRows: Int)
	extends TimeSeriesToBinTableConverter(colFormats, columnNames, nRows){

	import TimeSeriesToBinTableConverter.timeStampCol

	protected def timeCol: String
	protected def dateCol: String

	assert(colPositions.contains(timeCol), s"Missing $timeCol column")
	assert(colPositions.contains(dateCol), s"Missing $dateCol column")

	val timePos = sortedColumns.indexOf(timeCol)
	val datePos = sortedColumns.indexOf(dateCol)
	assert(timePos >= 0, s"Column $timeCol is missing from metadata descriptions")
	assert(datePos >= 0, s"Column $dateCol is missing from metadata descriptions")

	private val Seq(dateNull, timeNull, stampNull) = Seq(dateCol, timeCol, timeStampCol)
		.map(col => getNull(colFormats(col)))

	override protected def getTimeStamp(cells: Array[String], parsed: Array[AnyRef]): AnyRef = {
		val date = parsed(datePos).asInstanceOf[Int]
		val time = parsed(timePos).asInstanceOf[Int]

		if(date == dateNull || time == timeNull) stampNull
		else{
			val locDate = LocalDate.ofEpochDay(date)

			val dt =
				if(time >= 86400){
					val locTime = LocalTime.ofSecondOfDay(time - 86400)
					LocalDateTime.of(locDate, locTime).plusHours(24 - offsetFromUtc)
				} else {
					val locTime = LocalTime.ofSecondOfDay(time)
					LocalDateTime.of(locDate, locTime).minusHours(offsetFromUtc)
				}
			Double.box(dt.toInstant(ZoneOffset.UTC).toEpochMilli)
		}
	}

}