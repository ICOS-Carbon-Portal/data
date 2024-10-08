package se.lu.nateko.cp.data.api

import akka.Done
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model.*
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.http.scaladsl.unmarshalling.Unmarshaller
import akka.stream.Materializer
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.MongoDbIndex
import se.lu.nateko.cp.data.RestHeartConfig
import se.lu.nateko.cp.data.RestheartCollDef
import se.lu.nateko.cp.data.utils.akka.{done => ok}
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.DocObject
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.meta.core.data.PlainStaticCollection
import se.lu.nateko.cp.meta.core.data.StaticObject
import spray.json.*

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import eu.icoscp.geoipclient.CpGeoClient
import eu.icoscp.georestheart.RestHeartClientBase
import scala.util.Failure

class RestHeartClient(
	val config: RestHeartConfig, geoClient: CpGeoClient, http: HttpExt
)(using Materializer) extends RestHeartClientBase(config.base, geoClient, http):

	import http.system.dispatcher
	import config.base.collUri

	def logDownloadEvent(event: DlEventForMongo, ip: String)(using Envri): Future[Done] =
		val (propName, js) = event match
			case cpb: CpbDownloadInfo => "cpbDownload" -> cpb.toJson
			case csv: CsvDownloadInfo => "csvDownload" -> csv.toJson
			case zip: ZipExtractionInfo => "zipExtraction" -> zip.toJson
		logPortalUsage(JsObject(propName -> js), ip)

	def getUserLicenseAcceptance(uid: UserId)(using Envri): Future[Boolean] =
		getUserProps(uid, Seq("profile.icosLicenceOk")).map(_
			.fields.get("profile")
			.collect{case JsObject(fields) => fields.get("icosLicenceOk")}
			.collect{case Some(JsBoolean(v)) => v}
			.getOrElse(false)
		)

	def defineAggregations(collDef: RestheartCollDef)(using envri: Envri): Future[Done] = collDef.aggregations.map{aggrs =>

		def makeCacheForAggrs(aggrNames: List[String]): Future[Done] = aggrNames match {
			case Nil => ok
			case single :: rest => makeCacheForAggregation(collDef, single).flatMap(_ => makeCacheForAggrs(rest))
		}
		val log = http.system.log
		for(
			entity <- Marshal(aggrs.definitions).to[RequestEntity];
			uri = collUri(collDef.name);
			req = HttpRequest(uri = uri, method = HttpMethods.PUT, entity = entity);
			r <- singleRequest(req);
			res <- handleWritingOutcome(r, s"defining aggregations for ${collDef.name} collection in RestHeart")
		) yield {
			if(!aggrs.cached.isEmpty){
				log.info(s"Setting up RestHeart/MongoDb aggregation cache updates for ${collDef.name}/${aggrs.cached.mkString(" | ")} ($envri)")
				http.system.scheduler.scheduleWithFixedDelay(1.second, aggrs.cacheValidityInMinutes.minutes){
					() => makeCacheForAggrs(aggrs.cached.toList).failed.foreach(err =>
						log.error(err, "updating/creating cache for aggregations on " + collDef.name)
					)
				}
			}
			res
		}
	}.getOrElse(ok)

	def init: Future[Done] =
		if config.base.skipInit then ok
		else createDbsAndColls.flatMap(_ =>
			Future.sequence{
				config.base.db.keys.map{implicit envri =>
					setupCollection(config.portalUsage)
				}
			}.map(_ => Done)
		)

	private def getDownloadItem(obj: StaticObject) =
		JsObject(
			"time" -> JsString(java.time.Instant.now().toString),
			"fileName" -> JsString(obj.fileName),
			"hash" -> JsString(obj.hash.base64Url)
		)

	def saveDownload(dobj: DataObject, uid: UserId)(using Envri): Future[Done] =
		patchUserDoc(uid, "dobjDownloads", getDownloadItem(dobj), "data object download")

	def saveDownload(coll: PlainStaticCollection, uid: UserId)(using Envri): Future[Done] =
		val item = JsObject(
			"time" -> JsString(java.time.Instant.now().toString),
			"title" -> JsString(coll.title),
			"uri" -> JsString(coll.res.toString)
		)
		patchUserDoc(uid, "collDownloads", item, "collection download")

	def saveDownload(doc: DocObject, uid: UserId)(using Envri): Future[Done] =
		patchUserDoc(uid, "docDownloads", getDownloadItem(doc), "document download")

	private def patchUserDoc(uid: UserId, arrayProp: String, item: JsObject, itemName: String)(using Envri): Future[Done] = {
		val updateItem = JsObject(
			"$push" -> JsObject(
				arrayProp -> JsObject(
					"$each" -> JsArray(item),
					"$slice" -> JsNumber(-config.userDownloadsLogLength))))

		val entity = Marshal(updateItem).to[RequestEntity]
		def req = entity.flatMap(e => http.singleRequest(HttpRequest(uri = getUserUri(uid), method = HttpMethods.PATCH, entity = e)))

		req.flatMap{
			case resp if resp.status.intValue == 404 =>
				createUserIfNew(uid, "", "").flatMap(_ =>
					req.flatMap(r => handleWritingOutcome(r, s"saving $itemName to user profile"))
				)
			case r => handleWritingOutcome(r, s"saving $itemName to user profile")
		}
	}

	private def setupCollection(coll: RestheartCollDef)(using Envri): Future[Done] = {
		for(
			_ <- defineAggregations(coll);
			res <- setupCollIndices(coll)
		) yield res
	}

	private def setupCollIndices(coll: RestheartCollDef)(using Envri): Future[Done] = coll.indices.map { idxDefs =>
		val indexUri = {
			val colUri = collUri(coll.name)
			colUri.withPath(colUri.path / "_indexes")
		}

		import RestHeartClient._

		val currentIndexKeys: Future[Map[String, JsObject]] = for(
			resp <- http.singleRequest(HttpRequest(uri = indexUri.withRawQueryString("np")));
			keyInfos <- Unmarshal(resp.entity).to[Seq[KeyInfo]]
		) yield keyInfos.map{ki => ki._id -> ki.key}.toMap

		def uri(idxDef: MongoDbIndex) = indexUri.withPath(indexUri.path / idxDef.name)

		def createIndex(idxDef: MongoDbIndex): Future[Done] = {
			val payload = idxDef.ops match{
				case Some(ops) => JsObject("keys" -> idxDef.keys, "ops" -> ops)
				case None => JsObject("keys" -> idxDef.keys)
			}

			for(
				entity <- Marshal(payload).to[RequestEntity];
				r <- http.singleRequest(
					HttpRequest(uri = uri(idxDef), method = HttpMethods.PUT, entity = entity)
				);
				res <- handleWritingOutcome(r, s"creating index ${idxDef.name} in collection ${coll.name}")
			) yield res
		}

		def deleteIndex(idxDef: MongoDbIndex): Future[Done] = for(
			r <- http.singleRequest(
				HttpRequest(uri = uri(idxDef), method = HttpMethods.DELETE)
			);
			res <- handleWritingOutcome(r, s"deleting index ${idxDef.name} in collection ${coll.name}")
		)yield res

		val dones: Seq[Future[Done]] = idxDefs.map{idxDef =>

			currentIndexKeys.flatMap(_.get(idxDef.name) match {
				case None =>
					createIndex(idxDef)
				case Some(keyInfo) =>
					if(keyInfo == idxDef.keys) ok
					else deleteIndex(idxDef).flatMap(_ => createIndex(idxDef))
			})

		}

		Future.sequence(dones).map(_ => Done)
	}.getOrElse(ok)


	private def aggregationUri(coll: RestheartCollDef, aggrName: String)(using Envri): Uri = {
		val theCollUri = collUri(coll.name)
		theCollUri.withPath(theCollUri.path / "_aggrs" / aggrName)
	}

	private def makeCacheForAggregation(coll: RestheartCollDef, aggrName: String)(using Envri): Future[Done] = {

		val cacheCollName = "cacheFor" + aggrName.capitalize
		for(
			aggrResults <- fetchAggregation(coll, aggrName);
			_ <- createCollIfNotExists(collUri(cacheCollName), cacheCollName);
			_ <- dropAllCollectionDocs(cacheCollName);
			res <- bulkInsertDocs(cacheCollName, aggrResults)
		) yield res
	}

	//curl 'http://127.0.0.1:8088/db/contributors?pageSize=1000&page=1&np'
	//(plus paging)
	private def fetchAggregation(coll: RestheartCollDef, aggrName: String)(using Envri): Future[JsArray] = {
		val pageSize = 1000
		def getPage(n: Int): Future[JsArray] = {
			val uri = aggregationUri(coll, aggrName).withQuery(Uri.Query("pagesize" -> pageSize.toString, "page" -> n.toString, "np" -> ""))
			for(
				resp <- http.singleRequest(HttpRequest(uri = uri));
				docs <- Unmarshal(resp.entity.withContentType(ContentTypes.`application/json`)).to[JsValue]
			) yield docs match {
				case arr: JsArray => arr
				case obj => throw new Exception(s"Expected JSON array back from the RestHeart aggregation API endpoint, got $obj")
			}
		}
		def pagesFrom(n: Int): Future[Vector[JsArray]] = getPage(n).flatMap{arr =>
			if(arr.elements.size < pageSize) Future.successful(Vector(arr))
			else pagesFrom(n + 1).map(arr +: _)
		}
		pagesFrom(1).map{arrSeq =>
			val allElems: Vector[JsValue] = arrSeq.flatMap(_.elements)
			JsArray(allElems)
		}
	}

	//curl -X DELETE -G --data-urlencode 'filter={"_id": {"$exists": 1}}' 'http://127.0.0.1:8088/db/contributors/*'
	private def dropAllCollectionDocs(collName: String)(using Envri): Future[Done] = {
		val theCollUri = collUri(collName)
		val starUri = theCollUri.withPath(theCollUri.path / "*").withQuery(Uri.Query("filter" -> """{"_id": {"$exists": 1}}"""))
		for(
			resp <- http.singleRequest(HttpRequest(uri = starUri, method = HttpMethods.DELETE));
			res <- handleWritingOutcome(resp, "emptying collection" + collName)
		) yield res
	}

	//curl -X POST -H "Content-Type: application/json" --data '[{"a": 42}]' 'http://127.0.0.1:8088/db/contributors'
	private def bulkInsertDocs(collName: String, docs: JsArray)(using Envri): Future[Done] = {
		val theUri = collUri(collName)
		for(
			_ <- createCollIfNotExists(theUri, collName);
			entity <- Marshal(docs).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = theUri, method = HttpMethods.POST, entity = entity));
			res <- handleWritingOutcome(r, "bulk-inserting documents to " + collName)
		) yield res
	}

	private def handleWritingOutcome(resp: HttpResponse, opInfo: String): Future[Done] = {
		if(resp.status.isSuccess) {
			resp.discardEntityBytes()
			ok
		}
		else Unmarshal(resp.entity).to[String].flatMap{errMsg =>
			Future.failed(new Exception(s"Failed $opInfo: $errMsg"))
		}
	}
end RestHeartClient

object RestHeartClient extends DefaultJsonProtocol:
	case class KeyInfo(_id: String, key: JsObject)

	given keyInfoFormat: RootJsonFormat[KeyInfo] = jsonFormat2(KeyInfo.apply)
