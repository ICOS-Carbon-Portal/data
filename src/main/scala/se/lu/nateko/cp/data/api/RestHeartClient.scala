package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Try
import akka.Done
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model._
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.Materializer
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.{RestHeartConfig, RestheartCollDef}
import se.lu.nateko.cp.data.utils.Akka.{done => ok}
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import spray.json._
import akka.http.scaladsl.unmarshalling.Unmarshaller
import se.lu.nateko.cp.data.MongoDbIndex
import se.lu.nateko.cp.meta.core.data.StaticCollection

class RestHeartClient(val config: RestHeartConfig, http: HttpExt)(implicit m: Materializer) {

	import http.system.dispatcher

	def dbUri(implicit envri: Envri) = {
		import config._
		Uri(s"$baseUri/$dbName")
	}

	def collUri(alias: String)(implicit envri: Envri) = {
		val db = dbUri
		db.withPath(db.path / alias)
	}

	def getUserUri(uid: UserId)(implicit envri: Envri): Uri = {
		val users = collUri(config.usersCollection)
		users.withPath(users.path / uid.email)
	}

	def getUserProps(uid: UserId, keys: String)(implicit envri: Envri): Future[JsObject] = {
		val uri = getUserUri(uid).withQuery(Uri.Query("keys" -> keys))
		for(
			resp <- http.singleRequest(HttpRequest(uri = uri));
			userObj <- Unmarshal(resp.entity.withContentType(ContentTypes.`application/json`)).to[JsValue]
		) yield userObj.asJsObject("Expected a JSON object, got a JSON value")
	}

	def getUserLicenseAcceptance(uid: UserId)(implicit envri: Envri): Future[Boolean] =
		getUserProps(uid, """{"profile.icosLicenceOk": 1}""").flatMap{ uobj =>
			Future.fromTry(Try{
				uobj.fields("profile").asJsObject.fields("icosLicenceOk").asInstanceOf[JsBoolean].value
			})
		}

	def ensureCollExists(collDef: RestheartCollDef)(implicit envri: Envri): Future[Done] = ensureResourceExists(
		collUri(collDef.name),
		s"${collDef.description} ($envri)",
		collDef.name + " collection"
	)

	def ensureDbExists(implicit envri: Envri): Future[Done] = ensureResourceExists(
		dbUri,
		s"DB for various Carbon Portal based apps for $envri",
		"database"
	)

	private def ensureResourceExists(collUri: Uri, description: String, alias: String): Future[Done] = {
		http.singleRequest(HttpRequest(uri = collUri)).flatMap{resp =>
			resp.discardEntityBytes()
			if(resp.status == StatusCodes.NotFound){
				val collectionDescr = JsObject("comment" -> JsString(description))
				for(
					entity <- Marshal(collectionDescr).to[RequestEntity];
					r <- http.singleRequest(HttpRequest(uri = collUri, method = HttpMethods.PUT, entity = entity));
					done <- {
						r.discardEntityBytes()
						if(r.status == StatusCodes.Created) ok
						else Future.failed[Done](new Exception(s"Failed creating ${alias} in RestHeart: ${r.status.defaultMessage}"))
					}
				) yield done
			}
			else if(resp.status == StatusCodes.OK) ok
			else Future.failed[Done](new Exception(s"Unexpected response when checking for ${alias} in RestHeart : ${resp.status.defaultMessage}"))
		}
	}

	def defineAggregations(collDef: RestheartCollDef)(implicit envri: Envri): Future[Done] = collDef.aggregations.map{aggrs =>

		def makeCacheForAggrs(aggrNames: List[String]): Future[Done] = aggrNames match {
			case Nil => ok
			case single :: rest => makeCacheForAggregation(collDef, single).flatMap(_ => makeCacheForAggrs(rest))
		}
		val log = http.system.log
		for(
			entity <- Marshal(aggrs.definitions).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = collUri(collDef.name), method = HttpMethods.PUT, entity = entity));
			res <- handleWritingOutcome(r, s"defining aggregations for ${collDef.name} collection in RestHeart")
		) yield {
			if(!aggrs.cached.isEmpty){
				log.info(s"Setting up RestHeart/MongoDb aggregation cache updates for ${collDef.name}/${aggrs.cached.mkString(" | ")} ($envri)")
				http.system.scheduler.schedule(1.second, aggrs.cacheValidityInMinutes.minutes){
					makeCacheForAggrs(aggrs.cached.toList).failed.foreach(err =>
						log.error(err, "updating/creating cache for aggregations on " + collDef.name)
					)
				}
			}
			res
		}
	}.getOrElse(ok)

	def init: Future[Done] = Future.sequence{
		config.dbNames.keys.map{implicit envri =>
			ensureDbExists.flatMap{
				_ => setupCollection(config.dobjDownloads)
			}.flatMap{
				_ => setupCollection(config.portalUsage)
			}.flatMap{
				_ => setupCollection(config.collDownloads)
			}
		}
	}.map(_ => Done)

	def saveDownload(dobj: DataObject, uid: UserId)(implicit envri: Envri): Future[Done] = {
		val item = JsObject(
			"time" -> JsString(java.time.Instant.now().toString),
			"fileName" -> JsString(dobj.fileName),
			"hash" -> JsString(dobj.hash.base64Url)
		)
		patchUserDoc(uid, "dobjDownloads", item, "data object download")
	}

	def saveDownload(coll: StaticCollection, uid: UserId)(implicit envri: Envri): Future[Done] = {
		val item = JsObject(
			"time" -> JsString(java.time.Instant.now().toString),
			"title" -> JsString(coll.title),
			"uri" -> JsString(coll.res.toString)
		)
		patchUserDoc(uid, "collDownloads", item, "collection download")
	}

	private def patchUserDoc(uid: UserId, arrayProp: String, item: JsObject, itemName: String)(implicit envri: Envri): Future[Done] = {
		val updateItem = JsObject("$push" -> JsObject(arrayProp -> item))
		for(
			entity <- Marshal(updateItem).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = getUserUri(uid), method = HttpMethods.PATCH, entity = entity));
			res <- handleWritingOutcome(r, s"saving $itemName to user profile")
		) yield res
	}

	private def setupCollection(coll: RestheartCollDef)(implicit envri: Envri): Future[Done] = {
		for(
			_ <- ensureCollExists(coll);
			_ <- defineAggregations(coll);
			res <- setupCollIndices(coll)
		) yield res
	}

	private def setupCollIndices(coll: RestheartCollDef)(implicit envri: Envri): Future[Done] = coll.indices.map { idxDefs =>
		val indexUri = {
			val colUri = collUri(coll.name)
			colUri.withPath(colUri.path / "_indexes")
		}

		import RestHeartClient._

		val currentIndexKeys: Future[Map[String, JsObject]] = for(
			resp <- http.singleRequest(HttpRequest(uri = indexUri.withRawQueryString("np")));
			keyInfos <- Unmarshal(resp.entity).to[Seq[KeyInfo]](keyInfoUnmarsh, dispatcher, m)
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


	private def aggregationUri(coll: RestheartCollDef, aggrName: String)(implicit envri: Envri): Uri = {
		val theCollUri = collUri(coll.name)
		theCollUri.withPath(theCollUri.path / "_aggrs" / aggrName)
	}

	private def makeCacheForAggregation(coll: RestheartCollDef, aggrName: String)(implicit envri: Envri): Future[Done] = {

		val cacheCollName = "cacheFor" + aggrName.capitalize
		for(
			aggrResults <- fetchAggregation(coll, aggrName);
			_ <- ensureResourceExists(collUri(cacheCollName), "", cacheCollName);
			_ <- dropAllCollectionDocs(cacheCollName);
			res <- bulkInsertDocs(cacheCollName, aggrResults)
		) yield res
	}

	//curl 'http://127.0.0.1:8088/db/contributors?pageSize=1000&page=1&np'
	//(plus paging)
	private def fetchAggregation(coll: RestheartCollDef, aggrName: String)(implicit envri: Envri): Future[JsArray] = {
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
	private def dropAllCollectionDocs(collName: String)(implicit envri: Envri): Future[Done] = {
		val theCollUri = collUri(collName)
		val starUri = theCollUri.withPath(theCollUri.path / "*").withQuery(Uri.Query("filter" -> """{"_id": {"$exists": 1}}"""))
		for(
			resp <- http.singleRequest(HttpRequest(uri = starUri, method = HttpMethods.DELETE));
			res <- handleWritingOutcome(resp, "emptying collection" + collName)
		) yield res
	}

	//curl -X POST -H "Content-Type: application/json" --data '[{"a": 42}]' 'http://127.0.0.1:8088/db/contributors'
	private def bulkInsertDocs(collName: String, docs: JsArray)(implicit envri: Envri): Future[Done] = {
		val theUri = collUri(collName)
		for(
			_ <- ensureResourceExists(theUri, "", collName);
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
}

object RestHeartClient extends DefaultJsonProtocol{
	case class KeyInfo(_id: String, key: JsObject)

	implicit val keyInfoFormat = jsonFormat2(KeyInfo)
	implicit val keyInfoUnmarsh = implicitly[Unmarshaller[ResponseEntity, Seq[KeyInfo]]]
}
