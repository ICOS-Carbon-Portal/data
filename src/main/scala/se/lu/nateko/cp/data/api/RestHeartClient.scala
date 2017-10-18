package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.util.Try

import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.Materializer
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.RestHeartConfig
import spray.json._
import spray.json.JsBoolean
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model.RequestEntity
import se.lu.nateko.cp.meta.core.data.DataObject

class RestHeartClient(val config: RestHeartConfig, http: HttpExt)(implicit m: Materializer) {

	import http.system.dispatcher

	private val dlCollUri = collUri(config.dobjDownloadsCollection)

	def collUri(alias: String) = {
		import config._
		Uri(s"$baseUri/$dbName/$alias")
	}

	def getUserUri(uid: UserId): Uri = {
		val email = uid.email
		import config._
		Uri(s"$baseUri/$dbName/$usersCollection/$email")
	}

	def getUserProps(uid: UserId, keys: String): Future[JsObject] = {
		val uri = getUserUri(uid).withQuery(Uri.Query("keys" -> keys))
		for(
			resp <- http.singleRequest(HttpRequest(uri = uri));
			userObj <- Unmarshal(resp.entity.withContentType(ContentTypes.`application/json`)).to[JsValue]
		) yield userObj.asJsObject("Expected a JSON object, got a JSON value")
	}

	def getUserLicenseAcceptance(uid: UserId): Future[Boolean] =
		getUserProps(uid, """{"profile.icosLicenceOk": 1}""").flatMap{ uobj =>
			Future.fromTry(Try{
				uobj.fields("profile").asJsObject.fields("icosLicenceOk").asInstanceOf[JsBoolean].value
			})
		}

	def ensureDobjDownloadCollExists: Future[Unit] = ensureCollectionExists(
		dlCollUri,
		"Download log for CP-hosted data objects",
		config.dobjDownloadsCollection
	)

	def ensurePortalUseCollExists: Future[Unit] = ensureCollectionExists(
		collUri(config.portalUsageCollection),
		"Usage statistics of CP 'portal' app",
		config.portalUsageCollection
	)

	def ensureCollectionExists(collUri: Uri, description: String, alias: String): Future[Unit] = {
		http.singleRequest(HttpRequest(uri = collUri)).flatMap{resp =>
			resp.discardEntityBytes()
			if(resp.status == StatusCodes.NotFound){
				val collectionDescr = JsObject("comment" -> JsString(description))
				for(
					entity <- Marshal(collectionDescr).to[RequestEntity];
					r <- http.singleRequest(HttpRequest(uri = collUri, method = HttpMethods.PUT, entity = entity))
				) yield {
					r.discardEntityBytes()
					if(r.status == StatusCodes.Created) Future.successful(())
					else Future.failed(new Exception(s"Failed creating ${alias} collection in RestHeart: ${r.status.defaultMessage}"))
				}
			} else if(resp.status == StatusCodes.OK) Future.successful(())
			else Future.failed(new Exception(s"Unexpected response when checking for ${alias} collection in RestHeart : ${resp.status.defaultMessage}"))
		}
	}

	def defineDobjDownloadAggregations: Future[Unit] = {
		for(
			entity <- Marshal(config.dobjDownloadsAggregations).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = dlCollUri, method = HttpMethods.PUT, entity = entity))
		) yield {
			r.discardEntityBytes()
			if(r.status.isSuccess) Future.successful(())
			else Future.failed(new Exception(s"Failed defining data object download aggregations in RestHeart: ${r.status.defaultMessage}"))
		}
	}

	def init: Future[Unit] = ensurePortalUseCollExists.zip(ensureDobjDownloadCollExists).flatMap(_ => defineDobjDownloadAggregations)

	def logDownload(dobj: DataObject, ip: String): Future[Unit] = {
		import se.lu.nateko.cp.meta.core.data.JsonSupport.dataObjectFormat

		val logItem = JsObject(
			"time" -> JsString(java.time.Instant.now().toString),
			"ip" -> JsString(ip),
			"dobj" -> dobj.toJson
		)

		for(
			entity <- Marshal(logItem).to[RequestEntity];
			r <- http.singleRequest(HttpRequest(uri = dlCollUri, method = HttpMethods.POST, entity = entity))
		) yield {
			r.discardEntityBytes()
			if(r.status == StatusCodes.Created) Future.successful(())
			else Future.failed(new Exception(s"Failed logging data object download to RestHeart: ${r.status.defaultMessage}"))
		}
	}

	def saveDownload(dobj: DataObject, uid: UserId): Future[Unit] = {
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
			if(r.status == StatusCodes.NoContent) Future.successful(())
			else Future.failed(new Exception(s"Failed saving data object download to user profile: ${r.status.defaultMessage}"))
		}
	}

}
