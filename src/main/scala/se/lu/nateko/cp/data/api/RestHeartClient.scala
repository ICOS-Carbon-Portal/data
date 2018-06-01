package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.util.Try

import akka.Done
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.RequestEntity
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.Materializer
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.RestHeartConfig
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import spray.json._
import spray.json.JsBoolean

class RestHeartClient(val config: RestHeartConfig, http: HttpExt)(implicit m: Materializer) {

	import http.system.dispatcher

	private def dlCollUri(implicit envri: Envri) = collUri(config.dobjDownloadsCollection)
	private val ok = Future.successful(Done)

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

	def ensureDobjDownloadCollExists(implicit envri: Envri): Future[Done] = ensureResourceExists(
		dlCollUri,
		s"Download log for CP-hosted data objects ($envri)",
		config.dobjDownloadsCollection + " collection"
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

	def defineDobjDownloadAggregations(implicit envri: Envri): Future[Done] = {
		for(
			entity <- Marshal(config.dobjDownloadsAggregations).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = dlCollUri, method = HttpMethods.PUT, entity = entity))
		) yield {
			r.discardEntityBytes()
			if(r.status.isSuccess) ok
			else Future.failed(new Exception(s"Failed defining data object download aggregations in RestHeart: ${r.status.defaultMessage}"))
		}
	}.flatten

	def init: Future[Done] = Future.sequence{
		config.dbNames.keys.map{implicit envri =>
			ensureDbExists.flatMap{
				_ => ensureDobjDownloadCollExists
			}.flatMap{
				_ => defineDobjDownloadAggregations
			}
		}
	}.map(_ => Done)

	def saveDownload(dobj: DataObject, uid: UserId)(implicit envri: Envri): Future[Done] = {
		val updateItem = JsObject(
			"$push" -> JsObject(
				"dobjDownloads" -> JsObject(
					"time" -> JsString(java.time.Instant.now().toString),
					"fileName" -> JsString(dobj.fileName),
					"hash" -> JsString(dobj.hash.base64Url)
				)
			)
		)

		for(
			entity <- Marshal(updateItem).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = getUserUri(uid), method = HttpMethods.PATCH, entity = entity))
		) yield {
			r.discardEntityBytes()
			if(r.status.isSuccess) ok
			else Future.failed(new Exception(s"Failed saving data object download to user profile: ${r.status.defaultMessage}"))
		}
	}.flatten

}
