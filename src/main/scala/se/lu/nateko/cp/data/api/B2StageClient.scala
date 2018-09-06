package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.util.Failure

import akka.Done
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.headers
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.B2StageConfig
import se.lu.nateko.cp.data.streams.SourceReceptacleAsSink
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

class B2StageClient(config: B2StageConfig, http: HttpExt)(implicit mat: Materializer) {

	import mat.executionContext

	def getUri(item: B2StageItem) = {
		val pathPrefix = item match{
			case _: IrodsData => "/objects"
			case _: IrodsColl => "/collections"
		}
		Uri(config.host + pathPrefix + item.path)
	}

	private val authHeader = headers.Authorization(
		BasicHttpCredentials(config.username, config.password)
	)

	def list(coll: IrodsColl): Future[Seq[B2StageItem]] = {
		withAuth(HttpRequest(uri = getUri(coll)))
			.flatMap(parseItemsIfOk)
	}

	def create(coll: IrodsColl): Future[Done] =
		withAuth(HttpRequest(uri = getUri(coll), method = HttpMethods.PUT))
			.flatMap(failIfNotSuccess)

	def uploadObject(obj: IrodsData, source: Source[ByteString, Any]): Future[Sha256Sum] = {

		val uri = getUri(obj).withRawQueryString("force&checksum")
		val entity = HttpEntity.Chunked(ContentTypes.`application/octet-stream`, source.map(b => b))
		val req = HttpRequest(uri = uri, method = HttpMethods.PUT, entity = entity)

		withAuth(req).flatMap(ensureSuccess).flatMap{resp =>
			val hashTry = resp.headers.collectFirst{
				case header if header.is("x-checksum") =>
					Sha256Sum.fromBase64(header.value.stripPrefix("sha2:"))
			}.getOrElse(
				Failure(new CpDataException("No X-Checksum header in HTTP response from B2STAGE"))
			)
			Future.fromTry(hashTry)
		}
	}

	def objectSink(obj: IrodsData): Sink[ByteString, Future[Sha256Sum]] = SourceReceptacleAsSink(uploadObject(obj, _))

	def downloadObjectOnce(obj: IrodsData): Future[Source[ByteString, Any]] = {

		withAuth(HttpRequest(uri = getUri(obj))).flatMap(resp => resp.status match{
			case StatusCodes.OK =>
				Future.successful(resp.entity.withoutSizeLimit.dataBytes)
			case _ =>
				failIfNotSuccess(resp).map(_ => Source.empty)
		})
	}

	def downloadObjectReusable(obj: IrodsData): Source[ByteString, Future[Done]] = Source
		.lazily(() => Source.fromFutureSource(downloadObjectOnce(obj)))
		.mapMaterializedValue(_.flatten.map(_ => Done))

	def delete(item: B2StageItem): Future[Done] = withAuth(
		HttpRequest(uri = getUri(item).withRawQueryString("notrash"), method = HttpMethods.DELETE)
	).flatMap(failIfNotSuccess)

	def exists(item: B2StageItem): Future[Boolean] = withAuth(
			HttpRequest(uri = getUri(item), method = HttpMethods.HEAD)
		).flatMap(resp =>
			resp.status match{
				case StatusCodes.NotFound =>
					resp.discardEntityBytes()
					Future.successful(false)
				case _ =>
					failIfNotSuccess(resp).map(_ => true)
			}
		)

	private def withAuth(req: HttpRequest): Future[HttpResponse] = http.singleRequest{
		req.withHeaders(req.headers :+ authHeader)
	}

	private def parseItemsIfOk(resp: HttpResponse): Future[Seq[B2StageItem]] = analyzeResponse(resp){
		import B2StageItem._
		Unmarshal(_).to[ApiResponse].map(_.map(toB2StageItem))
	}

	private def failIfNotSuccess(resp: HttpResponse): Future[Done] = analyzeResponse(resp){
		_.entity.dataBytes.runWith(Sink.ignore)
	}

	private def ensureSuccess(resp: HttpResponse): Future[HttpResponse] = analyzeResponse(resp){
		Future.successful
	}

	private def analyzeResponse[T](resp: HttpResponse)(extractor: HttpResponse => Future[T]): Future[T] = {
		if(resp.status.isSuccess)
			extractor(resp)
		else
			Unmarshal(resp).to[String].flatMap{body =>
				val msg = if(body.trim.isEmpty) resp.status.value else body.trim
				Future.failed[T](new CpDataException(s"B2STAGE error: $msg"))
			}
	}
}
