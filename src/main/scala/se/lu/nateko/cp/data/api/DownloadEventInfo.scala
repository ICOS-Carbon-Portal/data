package se.lu.nateko.cp.data.api

import se.lu.nateko.cp.cpauth.core.CoreUtils
import se.lu.nateko.cp.cpauth.core.Crypto
import se.lu.nateko.cp.cpauth.core.DownloadEventInfo
import se.lu.nateko.cp.cpauth.core.DownloadEventInfo.AnonId
import se.lu.nateko.cp.cpauth.core.DownloadEventInfo.given_RootJsonFormat_Instant
import se.lu.nateko.cp.cpauth.core.UserId
import spray.json.*

import java.time.Instant


trait DlEventForPostgres extends DownloadEventInfo

case class DataObjDownloadInfo(
	time: Instant,
	ip: String,
	hashId: String,
	cpUser: Option[AnonId],
	distributor: Option[String],
	endUser: Option[String]
) extends DlEventForPostgres

case class CollectionDownloadInfo(time: Instant, ip: String, hashId: String, cpUser: Option[AnonId]) extends DlEventForPostgres
case class DocumentDownloadInfo(time: Instant, ip: String, hashId: String, cpUser: Option[AnonId]) extends DlEventForPostgres

object DownloadEventInfo extends DefaultJsonProtocol:

	given RootJsonFormat[CollectionDownloadInfo] = jsonFormat4(CollectionDownloadInfo.apply)
	given RootJsonFormat[DocumentDownloadInfo] = jsonFormat4(DocumentDownloadInfo.apply)
	given RootJsonFormat[DataObjDownloadInfo] = jsonFormat6(DataObjDownloadInfo.apply)

	given RootJsonFormat[DlEventForPostgres] with {

		override def write(obj: DlEventForPostgres): JsValue =
			def withType[T : JsonWriter](typ: String, e: T) =
				JsObject(e.toJson.asJsObject.fields + ("type" -> JsString(typ)))

			obj match
				case coll: CollectionDownloadInfo => withType("coll", coll)
				case doc: DocumentDownloadInfo => withType("doc", doc)
				case data: DataObjDownloadInfo => withType("dobj", data)

		override def read(json: JsValue): DlEventForPostgres =
			val obj = json.asJsObject("Expected DownloadEventInfo to be a JS object, not a plain value")
			obj.fields.get("type").collect{case JsString(typ) => typ} match
				case Some("dobj") => obj.convertTo[DataObjDownloadInfo]
				case Some("coll") => obj.convertTo[CollectionDownloadInfo]
				case Some("doc") => obj.convertTo[DocumentDownloadInfo]
				case None =>
					deserializationError("Missing field 'type' on JSON for DownloadEventInfo")
				case Some(other) =>
					deserializationError(s"Unsupported type of DownloadEventInfo: $other")
	}