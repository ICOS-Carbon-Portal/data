package se.lu.nateko.cp.data.api

import java.time.Instant
import spray.json.*
import DownloadEventInfo.{CsvSelect, CpbSlice}
import se.lu.nateko.cp.cpauth.core.AnonId
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.cpauth.core.CoreUtils
import se.lu.nateko.cp.meta.core.data.DataObject


sealed trait DownloadEventInfo:
	def time: Instant
	def hashId: String
	def cpUser: Option[AnonId]

sealed trait DlEventForPostgres extends DownloadEventInfo
sealed trait DlEventForMongo extends DownloadEventInfo:
	def userAgent: Option[String]

case class DataObjDownloadInfo(
	time: Instant,
	dobj: DataObject,
	cpUser: Option[AnonId],
	distributor: Option[String],
	endUser: Option[String]
) extends DlEventForPostgres:
	def hashId: String = dobj.hash.id

case class CollectionDownloadInfo(time: Instant, hashId: String, cpUser: Option[AnonId]) extends DlEventForPostgres
case class DocumentDownloadInfo(time: Instant, hashId: String, cpUser: Option[AnonId]) extends DlEventForPostgres

case class CsvDownloadInfo(
	time: Instant,
	hashId: String,
	cpUser: Option[AnonId],
	userAgent: Option[String],
	select: DownloadEventInfo.CsvSelect
) extends DlEventForMongo

case class CpbDownloadInfo(
	time: Instant,
	hashId: String,
	cpUser: Option[AnonId],
	colNums: Seq[Int],
	slice: Option[DownloadEventInfo.CpbSlice],
	localOrigin: Option[String],
	userAgent: Option[String]
) extends DlEventForMongo


case class ZipExtractionInfo(
	time: Instant,
	hashId: String,
	zipEntryPath: String,
	cpUser: Option[AnonId],
	localOrigin: Option[String],
	userAgent: Option[String]
) extends DlEventForMongo


object DownloadEventInfo extends DefaultJsonProtocol:
	import se.lu.nateko.cp.cpauth.core.JsonSupport.{given RootJsonFormat[Instant]}

	case class CsvSelect(columns: Option[Seq[String]], offset: Option[Long], limit: Option[Int])
	case class CpbSlice(offset: Long, length: Int)


	given JsonFormat[AnonId] with
		def write(id: AnonId) = JsString(id)
		def read(value: JsValue): AnonId = ??? //Do not expect to need

	given RootJsonFormat[CsvSelect] = jsonFormat3(CsvSelect.apply)
	given RootJsonFormat[CsvDownloadInfo] = jsonFormat5(CsvDownloadInfo.apply)
	given RootJsonFormat[CpbSlice] = jsonFormat2(CpbSlice.apply)
	given RootJsonFormat[CpbDownloadInfo] = jsonFormat7(CpbDownloadInfo.apply)
	given RootJsonFormat[ZipExtractionInfo] = jsonFormat6(ZipExtractionInfo.apply)
