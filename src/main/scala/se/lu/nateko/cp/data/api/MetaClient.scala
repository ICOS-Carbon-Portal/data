package se.lu.nateko.cp.data.api

import akka.actor.ActorSystem
import akka.http.scaladsl.model._
import akka.http.scaladsl.Http
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.ActorMaterializer
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import se.lu.nateko.cp.cpauth.core.UserInfo
import se.lu.nateko.cp.meta.core.data._
import se.lu.nateko.cp.meta.core.data.JsonSupport._
import se.lu.nateko.cp.data.MetaServiceConfig
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import spray.json._
import akka.http.scaladsl.marshalling.Marshal

class MetaClient(config: MetaServiceConfig)(implicit system: ActorSystem) {
	implicit val dispatcher = system.dispatcher
	implicit val materializer = ActorMaterializer(None, Some("metaClientMat"))
	import config.{baseUrl, uploadApiPath}

	private def get(uri: Uri): Future[HttpResponse] = {
		Http().singleRequest(
			HttpRequest(
				uri = uri,
				headers = headers.Accept(MediaTypes.`application/json`) :: Nil
			)
		)
	}

	private def post(uri: Uri, completionInfo: UploadCompletionInfo): Future[HttpResponse] = {
		Marshal(completionInfo).to[RequestEntity].flatMap( entity =>
			Http().singleRequest(
				HttpRequest(uri = uri, method = HttpMethods.POST, entity = entity)
			)
		)
	}

	def lookupPackage(hash: Sha256Sum): Future[DataObject] = {
		val url = baseUrl + "objects/" + hash.id
		get(url).flatMap(
			resp => resp.status match {
				case StatusCodes.OK =>
					Unmarshal(resp.entity).to[DataObject]
				case StatusCodes.NotFound =>
					throw new MetadataObjectNotFound(hash)
				case _ =>
					Future.failed(new Exception(s"Got ${resp.status} from the server"))
			}
		)
	}

	def userIsAllowedUpload(dataObj: DataObject, user: UserInfo): Future[Unit] = {
		val submitter = dataObj.submission.submitter
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
				case notOk =>
					failWithReturnedMessage(notOk, resp)
			}
		)
	}

	def completeUpload(hash: Sha256Sum, completionInfo: UploadCompletionInfo): Future[String] = {
		val url = config.baseUrl + config.uploadApiPath + "/" + hash.id

		post(url, completionInfo).flatMap(resp => resp.status match {
			case StatusCodes.OK =>
				Unmarshal(resp.entity).to[String]
			case notOk =>
				failWithReturnedMessage(notOk, resp)
		})
	}

	private def failWithReturnedMessage[T](status: StatusCode, resp: HttpResponse): Future[T] = {
		resp.entity.toStrict(3 seconds)            //making sure the response is not chunked
			.map(strict => strict.data.decodeString("UTF-8"))   //extracting the response body as string, to treat is as error message later
			.recover{case _: Throwable => s"Got $status from the metadata server"}  //fallback error message
			.flatMap(msg => Future.failed(new CpDataException(msg)))   //failing with the error message
	}
}
