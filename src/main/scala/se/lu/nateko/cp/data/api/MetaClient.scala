package se.lu.nateko.cp.data.api

import akka.actor.ActorSystem
import akka.http.scaladsl.model._
import akka.http.scaladsl.Http
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.ActorMaterializer

import scala.concurrent.Future

import se.lu.nateko.cp.cpauth.core.UserInfo
import se.lu.nateko.cp.meta.core.data._
import se.lu.nateko.cp.meta.core.data.JsonSupport._
import se.lu.nateko.cp.data.MetaServiceConfig
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import spray.json._

class MetaClient(config: MetaServiceConfig)(implicit system: ActorSystem) {
	implicit val dispatcher = system.dispatcher
	implicit val materializer = ActorMaterializer(None, Some("metaClientMat"))
	import config.{baseUrl, uploadApiPath}

	private def get(uri: Uri): Future[HttpResponse] = {
		Http().singleRequest(HttpRequest(uri = uri))
	}

	def lookupPackage(hash: Sha256Sum): Future[DataPackage] = {
		val url = baseUrl + "objects/" + hash.base64Url
		get(url).flatMap(
			resp => resp.status match {
				case StatusCodes.OK =>
					Unmarshal(resp.entity).to[DataPackage]
				case StatusCodes.NotFound =>
					throw new MetadataObjectNotFound(hash)
				case _ =>
					Future.failed(new Exception(s"Got ${resp.status} from the server"))
			}
		)
	}

	def userIsAllowedUpload(dataObj: DataPackage, user: UserInfo): Future[Unit] = {
		val submitter = dataObj.submission.submittingOrg
		val submitterUri = submitter.uri.toString
		val uri = Uri(s"$baseUrl$uploadApiPath/permissions").withQuery(
			Uri.Query("submitter" -> submitterUri, "userId" -> user.mail)
		)
		get(uri).flatMap(
			resp => resp.status match {
				case StatusCodes.OK =>
					Unmarshal(resp.entity).to[JsValue].map(_ match {
						case JsBoolean(b) =>
							if(!b) throw new UnauthorizedUpload({
								val submitterName = submitter.label.getOrElse(submitterUri)
								s"User '${user.mail}' is not authorized to upload on behalf of $submitterName"
							})
						case js => throw new Exception(s"Expected a JSON boolean, got $js")
					})
				case _ =>
					Future.failed(new Exception(s"Got ${resp.status} from the server"))
			}
		)
	}

}
