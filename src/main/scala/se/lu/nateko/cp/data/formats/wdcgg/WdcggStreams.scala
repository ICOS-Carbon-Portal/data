package se.lu.nateko.cp.data.formats.wdcgg

import java.nio.charset.Charset
import java.time._
import java.util.Locale

import akka.NotUsed
import akka.stream.scaladsl.{Flow, Framing, Keep, Sink}
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.TimeSeriesStreams.TimeSeriesParserEnhancer
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.wdcgg.WdcggParser._
import se.lu.nateko.cp.meta.core.data.{IngestionMetadataExtract, TabularIngestionExtract, TimeInterval, WdcggUploadCompletion}

import scala.collection.immutable.ListMap
import scala.concurrent.{ExecutionContext, Future}

object WdcggStreams{

	private val charSet = Charset.forName("Windows-1252").name()
	protected val valueFormatParser = new ValueFormatParser

	def linesFromBinary: Flow[ByteString, String, NotUsed] = Framing
		.delimiter(ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
		.map(_.decodeString(charSet).replace("\r", ""))

	def wdcggParser(format: ColumnsMetaWithTsCol)(implicit ctxt: ExecutionContext)
	: Flow[String, TableRow, Future[IngestionMetadataExtract]] =
		Flow[String]
		.scan(seed)(parseLine(format.colsMeta))
		.exposeParsingError
		.keepGoodRows
		.wireTapMat(Sink.head)((_, accFut) => accFut.map(_.header.kvPairs))
		.map(acc => TableRow(
			TableRowHeader(format.timeStampColumn +: acc.header.columnNames, acc.header.nRows),
			makeTimeStamp(acc.cells(0), acc.cells(1), acc.header.offsetFromUtc).toString +: replaceNullValues(acc.cells, acc.formats)
		))
		.wireTapMat(Sink.head)(Keep.both)
		.alsoToMat(Sink.last){ case ((kvPairs, firstRow), lastRow) =>
			getCompletionInfo(kvPairs, firstRow, lastRow)
		}

	def wdcggHeaderSink(columnsMeta: ColumnsMeta): Sink[String, Future[Map[String, String]]] = Flow[String]
		.scan(seed)(parseLine(columnsMeta))
		.takeWhile(!_.isOnData)
		.map(_.header.kvPairs)
		.toMat(Sink.last)(Keep.right)

	private val headerKeys = Set(
		"STATION NAME", "OBSERVATION CATEGORY", CountryKey, "CONTRIBUTOR",
		"LATITUDE", "LONGITUDE", "CONTACT POINT", ParamKey, "TIME INTERVAL",
		MeasUnitKey, "MEASUREMENT METHOD", SamplingTypeKey, "MEASUREMENT SCALE"
	)

	private def getCompletionInfo(
		keyValuesFut: Future[ListMap[String, String]],
		firstRowFut: Future[TableRow],
		lastRowFut: Future[TableRow]
		)(implicit ctxt: ExecutionContext): Future[WdcggUploadCompletion] =
		for(
			keyValues <- keyValuesFut;
			firstRow <- firstRowFut;
			lastRow <- lastRowFut
		) yield{
			val customMetadata = keyValues.filterKeys(headerKeys.contains)
			val start = Instant.parse(firstRow.cells(0))
			val stop = Instant.parse(lastRow.cells(0))

			WdcggUploadCompletion(TabularIngestionExtract(None, TimeInterval(start, stop)), firstRow.header.nRows, customMetadata)
		}

	private def makeTimeStamp(localDate: String, localTime: String, offsetFromUtc: Int): Instant = {
		val date = valueFormatParser.parse(localDate, Iso8601Date).asInstanceOf[Int]
		val time = valueFormatParser.parse(localTime, Iso8601TimeOfDay).asInstanceOf[Int]
		val locDate = LocalDate.ofEpochDay(date.toLong)

		val dt =
			if(time >= 86400){
				val locTime = LocalTime.ofSecondOfDay((time - 86400).toLong)
				LocalDateTime.of(locDate, locTime).plusHours((24 - offsetFromUtc).toLong)
			} else {
				val locTime = LocalTime.ofSecondOfDay(time.toLong)
				LocalDateTime.of(locDate, locTime).minusHours(offsetFromUtc.toLong)
			}
		dt.toInstant(ZoneOffset.UTC)
	}

	private def replaceNullValues(cells: Array[String], formats: Array[Option[ValueFormat]]): Array[String] = {
		cells.zip(formats).map {
			case (cell, None) => cell
			case (cell, Some(valueFormat)) => if (isNull(cell, valueFormat)) "" else cell
		}
	}

}
