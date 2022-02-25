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
import se.lu.nateko.cp.data.B2SafeConfig
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.SourceReceptacleAsSink
import se.lu.nateko.cp.data.utils.Akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import spray.json.DefaultJsonProtocol
import spray.json.JsonFormat

class B2SafeClient(config: B2SafeConfig, http: HttpExt)(implicit mat: Materializer) {

	import mat.executionContext
	import B2SafeClient._

	def getUri(item: B2SafeItem): Uri = {
		val pathPrefix = item match{
			case _: IrodsData => "/objects"
			case _: IrodsColl => "/collections"
		}
		getUri(pathPrefix, item)
	}

	private def getUri(pathPrefix: String, item: B2SafeItem) =
		Uri(config.host + pathPrefix + config.homePath + item.path)


	private val authHeader = headers.Authorization(
		BasicHttpCredentials(config.username, config.password)
	)

	def list(coll: IrodsColl): Future[Source[B2SafeItem, Any]] =
		withAuth(HttpRequest(uri = getUri(coll)))
			.flatMap(parseItemsIfOk)

	def create(coll: IrodsColl): Future[Done] = if(config.dryRun) done else withAuth(
			HttpRequest(uri = getUri(coll).withRawQueryString("recursive"), method = HttpMethods.PUT)
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
		}.getOrElse{
			val msg = s"No X-Checksum header in ${resp.status.intValue} HTTP response from B2SAFE"
			Failure(new CpDataException(msg))
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
		.lazyFutureSource(() => downloadObjectOnce(obj))
		.mapMaterializedValue(_.map(_ => Done))

	def delete(item: B2SafeItem): Future[Done] = if(config.dryRun) done else
		withAuth(objDeleteHttpRequest(item)).flatMap(failIfNotSuccess)

	def deleteFlow: Flow[IrodsData, Try[Done], NotUsed] =
		if(config.dryRun)
			Flow.apply[IrodsData].map(_ => Success(Done))
		else {
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

	private def objDeleteHttpRequest(item: B2SafeItem) =
		HttpRequest(uri = getUri(item).withRawQueryString("notrash"), method = HttpMethods.DELETE)

	def exists(item: B2SafeItem): Future[Boolean] =
		if(config.dryRun) Future.successful(false)
		else withAuth(HttpRequest(uri = getUri(item), method = HttpMethods.HEAD))
			.map{resp =>
				resp.discardEntityBytes()
				resp.status.isSuccess()
			}

	def getHashsum(data: IrodsData): Future[Option[Sha256Sum]] =
		if(config.dryRun)
			Future.successful(None)
		else withAuth(HttpRequest(uri = getUri("/metadata", data))).flatMap{resp =>
			if(resp.status == StatusCodes.NotFound) {
				resp.discardEntityBytes()
				Future.successful(None)
			} else analyzeResponse(resp){resp =>
				import spray.json._
				resp.entity.toStrict(3.seconds).map{_
					.data.utf8String.parseJson.convertTo[MetaItem].checksum
					.flatMap(cs => Sha256Sum.fromBase64(cs.stripPrefix("sha2:")).toOption)
				}
			}
		}

	private def withAuth(origReq: HttpRequest): Future[HttpResponse] = {

		def withRedirects(req: HttpRequest, visited: Set[Uri]): Future[HttpResponse] =
			if(visited.contains(req.uri)) {
				val msg = s"B2SAFE redirection loop, visited URLs: ${visited.mkString(", ")}"
				Future.failed(new CpDataException(msg))

			} else if(visited.size > 10) {
				val msg = s"B2SAFE problem: too many redirects, visited URLs:\n${visited.mkString("\n")}"
				Future.failed(new CpDataException(msg))

			} else http.singleRequest(req.withEntity(HttpEntity.Empty)).flatMap{resp =>

				if(resp.status.isRedirection){
					resp.discardEntityBytes()
					resp.header[Location].fold(
						Future.failed[HttpResponse](
							new CpDataException(
								s"Got a ${resp.status.intValue} redirect from B2SAFE, but no target URI (Location)"
							)
						)
					){
						loc =>
						//println(s"B2SAFE: empty-content ${req.method} request to ${req.uri} got redirected to ${loc.uri}")
						withRedirects(req.withUri(loc.uri), visited + req.uri)
					}
				}
				else if(req.entity.isKnownEmpty || resp.status.isFailure) Future.successful(resp)
				else { //success, but the original request had non-empty payload
					resp.discardEntityBytes()
					//redoing the request with the payload this time, and asking for no redirect
					val finalReq = withNoRedirect(req)
					//println(s"B2SAFE: Re-doing ${finalReq.method} request to ${finalReq.uri}, but with intended HTTP entity this time")
					http.singleRequest(finalReq)
				}

			}

		val authReq = origReq.withHeaders(origReq.headers :+ authHeader)
		withRedirects(authReq, Set.empty)
	}

	private def withNoRedirect(req: HttpRequest): HttpRequest = {
		val noredir = "noredirect"
		val queryString = req.uri.rawQueryString.getOrElse("")
		if(queryString.contains(noredir)) req else req.withUri(
				req.uri.withRawQueryString((if(queryString.isEmpty) "" else queryString + "&") + noredir)
		)
	}

	private def parseItemsIfOk(resp: HttpResponse): Future[Source[B2SafeItem, Any]] = analyzeResponse(resp){_ =>
		import spray.json._
		val resStream = resp.entity.withoutSizeLimit.dataBytes
			.via(Framing.delimiter(ByteString("\n"), 8000))
			.map(bs => bs.utf8String.parseJson.convertTo[ApiResponseItem])
			.map(toB2SafeItem)
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
		if(resp.status.isSuccess && !resp.status.isRedirection)
			extractor(resp)
		else
			Unmarshal(resp).to[String].flatMap{body =>
				val msg = if(body.trim.isEmpty) resp.status.value else body.trim
				Future.failed[T](new CpDataException(s"B2SAFE error: $msg"))
			}
	}

	private def toB2SafeItem(item: ApiResponseItem): B2SafeItem = {
		def makeColl(segments: List[String]): IrodsColl = segments match{
			case Nil => B2SafeItem.Root
			case head :: tail => IrodsColl(head, Some(makeColl(tail)))
		}

		val collPathSegments = item.collectionName
			.stripPrefix(config.homePath).stripPrefix("/")
			.split("/").reverse.filterNot(_.isEmpty).toList

		val coll = makeColl(collPathSegments)

		item.dataName.fold[B2SafeItem](coll)(IrodsData(_, coll))
	}
}

object B2SafeClient extends DefaultJsonProtocol{
	class UploadRequest[T](val context: T, val obj: IrodsData, val src: Source[ByteString, Any])
	class UploadResponse[T](val context: T, val result: Try[Sha256Sum])

	private case class ApiResponseItem(dataName: Option[String], collectionName: String)
	private case class MetaItem(checksum: Option[String])

	private implicit val apiResponseItemReader: JsonFormat[ApiResponseItem] = jsonFormat2(ApiResponseItem.apply)
	private implicit val metaItemReader: JsonFormat[MetaItem] = jsonFormat1(MetaItem.apply)

}
