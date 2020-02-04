package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import akka.Done
import akka.NotUsed
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
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.B2StageConfig
import se.lu.nateko.cp.data.streams.SourceReceptacleAsSink
import se.lu.nateko.cp.data.utils.Akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.data.streams.DigestFlow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Framing

class B2StageClient(config: B2StageConfig, http: HttpExt)(implicit mat: Materializer) {

	import mat.executionContext
	import B2StageClient._

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

	def list(coll: IrodsColl): Future[Source[B2StageItem, Any]] =
		withAuth(HttpRequest(uri = getUri(coll)))
			.flatMap(parseItemsIfOk)

	def create(coll: IrodsColl): Future[Done] = if(config.dryRun) done else withAuth(
			HttpRequest(uri = getUri(coll), method = HttpMethods.PUT)
		).flatMap(failIfNotSuccess)

	def uploadObject(obj: IrodsData, source: Source[ByteString, Any]): Future[Sha256Sum] =
		if(config.dryRun)
			source.viaMat(DigestFlow.sha256)(Keep.right).to(Sink.ignore).run()
		else
			withAuth(objUploadHttpRequest(obj, source))
				.flatMap(discardPayloadFailIfNotSuccess)
				.flatMap{resp =>
					Future.fromTry(extractHashsum(resp))
				}

	def uploadFlow[T]: Flow[UploadRequest[T], UploadResponse[T], NotUsed] = {
		val in = Flow.apply[UploadRequest[T]].map(ur => objUploadHttpRequest(ur.obj, ur.src) -> ur.context)

		val out = innerReqFlow[T].mapAsyncUnordered(1){
			case (respTry, context) =>
				Future.fromTry(respTry)
					.flatMap(discardPayloadFailIfNotSuccess)
					.transform{
						(respTry: Try[HttpResponse]) => Success(
							new UploadResponse[T](context, respTry.flatMap(extractHashsum))
						)
					}
		}
		in via out
	}

	private def innerReqFlow[T]: Flow[(HttpRequest, T), (Try[HttpResponse], T), Any] = {
		val auth = Uri(config.host).authority
		val port = if(auth.port == 0) 443 else auth.port
		http.cachedHostConnectionPoolHttps[T](auth.host.toString, port)
	}

	private def objUploadHttpRequest(obj: IrodsData, source: Source[ByteString, Any]): HttpRequest = {
		val uri = getUri(obj).withRawQueryString("force&checksum")
		val entity = HttpEntity.Chunked(ContentTypes.`application/octet-stream`, source.map(b => b))
		HttpRequest(uri = uri, method = HttpMethods.PUT, entity = entity)
	}

	private def extractHashsum(resp: HttpResponse): Try[Sha256Sum] = resp.headers
		.collectFirst{
			case header if header.is("x-checksum") =>
				Sha256Sum.fromBase64(header.value.stripPrefix("sha2:"))
		}.getOrElse(
			Failure(new CpDataException("No X-Checksum header in HTTP response from B2STAGE"))
		)

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

	def delete(item: B2StageItem): Future[Done] = if(config.dryRun) done else
		withAuth(objDeleteHttpRequest(item)).flatMap(failIfNotSuccess)

	def deleteFlow: Flow[IrodsData, Try[Done], NotUsed] = {
		val in = Flow.apply[IrodsData].map{obj =>
			objDeleteHttpRequest(obj) -> obj
		}

		val out = innerReqFlow[IrodsData].mapAsyncUnordered(1){
			case (resp, _) =>
				Future.fromTry(resp).flatMap(failIfNotSuccess).transform{
					doneTry => Success(doneTry)
				}
		}
		in via out
	}

	private def objDeleteHttpRequest(item: B2StageItem) =
		HttpRequest(uri = getUri(item).withRawQueryString("notrash"), method = HttpMethods.DELETE)

	def exists(item: B2StageItem): Future[Boolean] =
		withAuth(HttpRequest(uri = getUri(item), method = HttpMethods.HEAD))
			.map{resp =>
				resp.discardEntityBytes()
				resp.status.isSuccess()
			}

	private def withAuth(req: HttpRequest): Future[HttpResponse] = http.singleRequest{
		req.withHeaders(req.headers :+ authHeader)
	}

	private def parseItemsIfOk(resp: HttpResponse): Future[Source[B2StageItem, Any]] = analyzeResponse(resp){_ =>
		import B2StageItem._
		import spray.json._
		val resStream = resp.entity.withoutSizeLimit.dataBytes
			.via(Framing.delimiter(ByteString("\n"), 8000))
			.map(bs => bs.utf8String.parseJson.convertTo[ApiResponseItem])
			.map(toB2StageItem)
		Future.successful(resStream)
	}

	private def failIfNotSuccess(resp: HttpResponse): Future[Done] = analyzeResponse(resp){
		_.entity.dataBytes.runWith(Sink.ignore)
	}

	private def discardPayloadFailIfNotSuccess(resp: HttpResponse): Future[HttpResponse] = analyzeResponse(resp){r =>
		r.discardEntityBytes()
		Future.successful(r)
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

object B2StageClient{
	class UploadRequest[T](val context: T, val obj: IrodsData, val src: Source[ByteString, Any])
	class UploadResponse[T](val context: T, val result: Try[Sha256Sum])
}