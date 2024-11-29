package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import akka.Done
import akka.NotUsed
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.headers
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.model.headers.Location
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.Materializer
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Framing
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.api.dataFail
import se.lu.nateko.cp.data.IRODSConfig
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.SourceReceptacleAsSink
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import spray.json.DefaultJsonProtocol
import spray.json.RootJsonFormat
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.given
import akka.http.scaladsl.model.FormData
import akka.http.scaladsl.model.Multipart
import akka.http.scaladsl.model.HttpEntity.IndefiniteLength

class IRODSClient(config: IRODSConfig, http: HttpExt)(using mat: Materializer):

	import mat.executionContext
	import IRODSClient.{_, given}

	private var authToken: Future[String] = fetchToken()

	val objUri = getUri("/data-objects")
	val collUri = getUri("/collections")
	val authUri = getUri("/authenticate")

	private def getUri(pathSuffix: String) = Uri(config.baseUrl + pathSuffix)
	private def getUri(item: B2SafeItem): Uri = item match
		case _: IrodsColl => collUri
		case _: IrodsData => objUri

	def list(coll: IrodsColl): Future[Seq[String]] =
		val q = Uri.Query("op" -> "list", "lpath" -> coll.path)
		withAuth(HttpRequest(uri = collUri.withQuery(q)))
			.flatMap(resp => Unmarshal(resp).to[EntryList])
			.map(_.entries)

	def create(coll: IrodsColl, withIntermediates: Boolean = false): Future[Done] = if(config.dryRun) done else withAuth{
		val form = FormData(
			"op" -> "create",
			"lpath" -> coll.path,
			"create-intermediates" -> (if withIntermediates then "1" else "0")
		)
		HttpRequest(uri = collUri, method = HttpMethods.POST, entity = form.toEntity)
	}.flatMap(failIfNotSuccess)

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
		val auth = Uri(config.baseUrl).authority
		val port = if(auth.port == 0) 443 else auth.port
		http.cachedHostConnectionPoolHttps[T](auth.host.toString, port)
	}

	private def objUploadHttpRequest(obj: IrodsData, source: Source[ByteString, Any]): HttpRequest =
		val bytesEntity = IndefiniteLength(ContentTypes.`application/octet-stream`, source)

		val op    = Multipart.FormData.BodyPart("op", HttpEntity("write"))
		val lpath = Multipart.FormData.BodyPart("lpath", HttpEntity(obj.path))
		val bytes = Multipart.FormData.BodyPart("bytes", bytesEntity)

		val entity = Multipart.FormData(op, lpath, bytes).toEntity()
		HttpRequest(uri = objUri, method = HttpMethods.POST, entity = entity)


	// private def extractHashsum(resp: HttpResponse): Try[Sha256Sum] = resp.headers
	// 	.collectFirst:
	// 		case header if header.is("x-checksum") =>
	// 			Sha256Sum.fromBase64(header.value.stripPrefix("sha2:"))
	// 	.getOrElse:
	// 		val msg = s"No X-Checksum header in ${resp.status.intValue} HTTP response from B2SAFE"
	// 		Failure(new CpDataException(msg))


	def objectSink(obj: IrodsData): Sink[ByteString, Future[Sha256Sum]] = SourceReceptacleAsSink(uploadObject(obj, _))

	def downloadObjectOnce(obj: IrodsData): Future[Source[ByteString, Any]] =
		val q = Uri.Query("op" -> "read", "lpath" -> obj.path)
		withAuth(HttpRequest(uri = objUri.withQuery(q))).flatMap: resp =>
			resp.status match
				case StatusCodes.OK =>
					Future.successful(resp.entity.withoutSizeLimit.dataBytes)
				case _ =>
					failIfNotSuccess(resp).map(_ => Source.empty)


	def downloadObjectReusable(obj: IrodsData): Source[ByteString, Future[Done]] = Source
		.lazyFutureSource(() => downloadObjectOnce(obj))
		.mapMaterializedValue(_.map(_ => Done))

	def delete(item: B2SafeItem): Future[Done] = if(config.dryRun) done else
		withAuth(deleteHttpRequest(item)).flatMap(failIfNotSuccess)

	def deleteFlow: Flow[IrodsData, Try[Done], NotUsed] =
		if(config.dryRun)
			Flow.apply[IrodsData].map(_ => Success(Done))
		else {
			val in = Flow.apply[IrodsData].map{obj =>
				deleteHttpRequest(obj) -> obj
			}

			val out = innerReqFlow[IrodsData].mapAsyncUnordered(1){
				case (resp, _) =>
					Future.fromTry(resp).flatMap(failIfNotSuccess).transform{
						doneTry => Success(doneTry)
					}
			}
			in via out
		}

	private def deleteHttpRequest(item: B2SafeItem) = HttpRequest(
		uri = getUri(item),
		method = HttpMethods.POST,
		entity = FormData("op" -> "remove", "lpath" -> item.path, "no-trash" -> "1").toEntity
	)

	def exists(item: B2SafeItem): Future[Boolean] =
		if config.dryRun then Future.successful(false)
		else
			val q = Uri.Query("op" -> "stat", "lpath" -> item.path)
			withAuth(HttpRequest(uri = getUri(item).withQuery(q)))
				.map: resp =>
					resp.discardEntityBytes()
					resp.status.isSuccess()


	def getHashsum(data: IrodsData): Future[Option[Sha256Sum]] =
		if(config.dryRun)
			Future.successful(None)
		else
			val q = Uri.Query("op" -> "calculate_checksum", "lpath" -> data.path)
			withAuth(HttpRequest(uri = objUri.withQuery(q))).flatMap: resp =>
				if resp.status == StatusCodes.NotFound then
					resp.discardEntityBytes()
					Future.successful(None)
				else analyzeResponse(resp): resp =>
					Unmarshal(resp).to[Checksum].flatMap: cs =>
						Future.fromTry:
							Sha256Sum.fromBase64(cs.checksum.stripPrefix("sha2:"))
								.map(Option(_))


	private val basicAuthHeader = headers.Authorization(
		BasicHttpCredentials(config.username, config.password)
	)

	private def fetchToken(): Future[String] = http
		.singleRequest(HttpRequest(uri = authUri, headers = Seq(basicAuthHeader)))
		.flatMap(Unmarshal(_).to[String])
		.map(_.trim)

	private def withAuth(origReq: HttpRequest): Future[HttpResponse] =
		authToken.value.foreach: res =>
			if res.isFailure then authToken = fetchToken()

		def singleTry(): Future[HttpResponse] = authToken.flatMap: token =>
			val creds = headers.OAuth2BearerToken(token)
			val hdrs = origReq.headers :+ headers.Authorization(creds)
			http.singleRequest(origReq.withHeaders(hdrs))

		singleTry().flatMap: resp =>
			if resp.status.intValue == 401 then
				authToken = fetchToken()
				singleTry()
			else
				Future.successful(resp)
	end withAuth


	private def failIfNotSuccess(resp: HttpResponse): Future[Done] = analyzeResponse(resp):
		_.entity.dataBytes.runWith(Sink.ignore)

	private def discardPayloadFailIfNotSuccess(resp: HttpResponse): Future[HttpResponse] = analyzeResponse(resp): r =>
		r.discardEntityBytes()
		Future.successful(r)


	private def analyzeResponse[T](resp: HttpResponse)(extractor: HttpResponse => Future[T]): Future[T] =
		if resp.status.isSuccess && !resp.status.isRedirection then
			extractor(resp)
		else
			Unmarshal(resp).to[String].flatMap: body =>
				val msg = if(body.trim.isEmpty) resp.status.value else body.trim
				Future.failed[T](new CpDataException(s"iRODS error: $msg"))

end IRODSClient

object IRODSClient extends DefaultJsonProtocol:
	class UploadRequest[T](val context: T, val obj: IrodsData, val src: Source[ByteString, Any])
	class UploadResponse[T](val context: T, val result: Try[Sha256Sum])
	private case class EntryList(entries: Seq[String])
	private case class Checksum(checksum: String)

	private given RootJsonFormat[EntryList] = jsonFormat1(EntryList.apply)
	private given RootJsonFormat[Checksum] = jsonFormat1(Checksum.apply)


