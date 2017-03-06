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
import spray.json.{ JsObject, JsValue }
import spray.json.JsBoolean

class RestHeartClient(val config: RestHeartConfig, http: HttpExt)(implicit m: Materializer) {

	import http.system.dispatcher

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
}
