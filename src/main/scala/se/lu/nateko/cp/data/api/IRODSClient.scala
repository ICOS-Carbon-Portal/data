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
import se.lu.nateko.cp.data.IRODSConfig
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.SourceReceptacleAsSink
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import spray.json.DefaultJsonProtocol
import spray.json.JsNull
import spray.json.JsValue
import spray.json.RootJsonFormat
import spray.json.enrichString
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.given
import akka.http.scaladsl.model.FormData
import akka.http.scaladsl.model.Multipart
import akka.http.scaladsl.model.HttpEntity.IndefiniteLength
import akka.http.scaladsl.model.HttpEntity.Strict
import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.model.MediaRanges
import akka.http.scaladsl.model.headers.ProductVersion

class IRODSClient(config: IRODSConfig, http: HttpExt)(using mat: Materializer):

	import mat.executionContext
	import IRODSClient.{_, given}

	val objUri = getUri("/data-objects")
	val collUri = getUri("/collections")
	val authUri = getUri("/authenticate")

	def lpath(item: B2SafeItem): String = config.homePath + item.path

	private def getUri(pathSuffix: String) = Uri(config.baseUrl + pathSuffix)
	private def getUri(item: B2SafeItem): Uri = item match
		case _: IrodsColl => collUri
		case _: IrodsData => objUri

	def list(coll: IrodsColl): Future[Seq[String]] =
		val q = Uri.Query("op" -> "list", "lpath" -> lpath(coll))
		withAuth(HttpRequest(uri = collUri.withQuery(q)))
			.flatMap(analyzeResponse(_)(_.convertTo[EntryList]))
			.map(_.entries)

	def create(coll: IrodsColl, withIntermediates: Boolean): Future[Done] =
		if config.dryRun then done
		else withAuth:
			val form = FormData(
				"op" -> "create",
				"lpath" -> lpath(coll),
				"create-intermediates" -> (if withIntermediates then "1" else "0")
			)
			HttpRequest(uri = collUri, method = HttpMethods.POST, entity = form.toEntity)
		.flatMap(failIfNotSuccess)

	def uploadObject(obj: IrodsData, source: Source[ByteString, Any], parallelism: Int = 1): Future[Seq[(Long, Int)]] =
		def chunks: Source[(Long, ByteString), Any] = source
			.via(Flow[ByteString].groupedWeighted(ChunkSize)(_.size))
			.map(concatByteStrings)
			.scan(0L -> ByteString.empty):
				case ((offset, bs0), bs1) => (offset + bs0.size) -> bs1
			.filter:
				case (offset, bs) => bs.size > 0

		if config.dryRun then
			source.toMat(Sink.ignore)(Keep.right).run().map(_ => Nil)
		else if parallelism > 1 then
			// TODO Remove this if-branch when parallel uploads are working
			Future.failed(CpDataException("Parallel iRODS uploads are not working yet, therefore disabled"))
		else if parallelism > 1 then
			parWriteInit(obj, parallelism).flatMap: handle =>
				println(s"Got parallel write handle: ${handle.parallel_write_handle}")
				chunks
					.zipWithIndex
					.mapAsyncUnordered(parallelism):
						case ((offset, bs), idx) =>
							val strIdx = (idx % parallelism).toInt
							println(s"Will upload ${bs.size} bytes with offset $offset using stream $strIdx")
							withAuth(pagedUploadRequest(obj, bs, offset, Some(handle -> strIdx)))
								.flatMap(failIfNotSuccess)
								.map(_ => offset -> bs.size)
					.runWith(Sink.seq)
					.andThen:
						// shut down the parralel write even in the case of failure
						case Failure(_) => parWriteShutdown(handle)
					.flatMap: res =>
						// expose parWriteShutdown error, should it occur
						parWriteShutdown(handle).map(_ => res)
		else chunks
			.mapAsync(1): (offset, bs) =>
				withAuth(pagedUploadRequest(obj, bs, offset))
					.flatMap(failIfNotSuccess)
					.map(_ => offset -> bs.size)
			.runWith(Sink.seq)
	end uploadObject


	private def parWriteInit(data: IrodsData, nStreams: Int): Future[ParWriteHandle] =
		val req = HttpRequest(
			uri = objUri,
			method = HttpMethods.POST,
			entity = FormData(
				"op" -> "parallel_write_init",
				"lpath" -> lpath(data),
				"stream-count" -> nStreams.toString
			).toEntity
		)
		withAuth(req).flatMap:
			analyzeResponse(_)(_.convertTo[ParWriteHandle])

	def parWriteShutdown(handle: ParWriteHandle): Future[Done] =
		val req = HttpRequest(
			uri = objUri,
			method = HttpMethods.POST,
			entity = FormData(
				"op" -> "parallel_write_shutdown",
				"parallel_write_handle" -> handle.parallel_write_handle
			).toEntity
		)
		withAuth(req).flatMap(failIfNotSuccess)


	private def pagedUploadRequest(
		obj: IrodsData,
		source: ByteString,
		offset: Long,
		streamId: Option[(ParWriteHandle, Int)] = None
	): HttpRequest =

		def bpart(name: String, ent: HttpEntity.Strict) = Multipart.FormData.BodyPart.Strict(name, ent)
		val truncation = if offset == 0 && streamId.isEmpty then "1" else "0"
		val bParts = Seq(
			bpart("op",                    HttpEntity("write")),
			bpart("truncate",              HttpEntity(truncation)),
			bpart("lpath",                 HttpEntity(lpath(obj))),
			bpart("offset",                HttpEntity(offset.toString)),
			bpart("bytes",                 HttpEntity(source))
		) ++ streamId.fold(Nil): (handle, streamIdx) =>
			Seq(
				bpart("stream-index",          HttpEntity(streamIdx.toString)),
				bpart("parallel-write-handle", HttpEntity(handle.parallel_write_handle))
			)
		++ config.resource
			// TODO Remove the filter when parallel writes work and support resource selection
			.filter(_ => streamId.isEmpty)
			.map: res =>
				bpart("resource", HttpEntity(res))

		val formData: Multipart.FormData.Strict = Multipart.FormData(bParts*)

		HttpRequest(
			uri = objUri,
			method = HttpMethods.POST,
			entity = formData.toEntity
		)
	end pagedUploadRequest


	def objectSink(obj: IrodsData): Sink[ByteString, Future[Seq[(Long, Int)]]] = SourceReceptacleAsSink(uploadObject(obj, _))

	def downloadObject(obj: IrodsData): Future[Source[ByteString, Any]] =
		getStats(obj).map(stats => downloadObject(obj, stats.size))

	def downloadObject(obj: IrodsData, size: Long): Source[ByteString, Any] = Source
		.fromIterator(() => readPages(size, ChunkSize))
		.flatMapConcat: (offset, count) =>
			Source.lazyFutureSource(() => downloadObjectChunk(obj, offset, count))

	private def downloadObjectChunk(obj: IrodsData, offset: Long, count: Int): Future[Source[ByteString, Any]] =
		val q = Uri.Query(
			"op" -> "read",
			"lpath" -> lpath(obj),
			"offset" -> offset.toString,
			"count" -> count.toString
		)
		withAuth(HttpRequest(uri = objUri.withQuery(q))).flatMap: resp =>
			resp.status match
				case StatusCodes.OK =>
					Future.successful(resp.entity.withoutSizeLimit.dataBytes)
				case _ =>
					failIfNotSuccess(resp).map(_ => Source.empty)


	def delete(item: B2SafeItem): Future[Done] = if(config.dryRun) done else
		val commonFields = Map(
			"op" -> "remove",
			"lpath" -> lpath(item),
			"no-trash" -> "1"
		)
		val formFields = item match
			case _: IrodsData => commonFields + ("catalog-only" -> "0")
			case _: IrodsColl => commonFields

		val req = HttpRequest(
			uri = getUri(item),
			method = HttpMethods.POST,
			entity = FormData(formFields).toEntity
		)
		withAuth(req).flatMap(failIfNotSuccess)


	def exists(item: B2SafeItem): Future[Boolean] =
		if config.dryRun then Future.successful(false)
		else
			val q = Uri.Query("op" -> "stat", "lpath" -> lpath(item))
			withAuth(HttpRequest(uri = getUri(item).withQuery(q)))
				.flatMap(failIfNotSuccess)
				.transform:
					case Success(_) => Success(true)
					case Failure(_) => Success(false)


	def getHashsumOpt(data: IrodsData): Future[Option[Sha256Sum]] =
		if config.dryRun then Future.successful(None)
		else
			requestHashsum(data).flatMap: resp =>
				if resp.status == StatusCodes.NotFound then
					resp.discardEntityBytes()
					Future.successful(None)
				else parseHashsum(resp).map(Option(_))

	def getHashsum(data: IrodsData): Future[Sha256Sum] = requestHashsum(data).flatMap(parseHashsum(_))

	def getStats(data: IrodsData): Future[DobjStats] =
		val q = Uri.Query("op" -> "stat", "lpath" -> lpath(data))
		withAuth(HttpRequest(uri = objUri.withQuery(q))).flatMap:
			analyzeResponse(_)(_.convertTo[DobjStats])

	private def requestHashsum(data: IrodsData): Future[HttpResponse] =
		val form = FormData("op" -> "calculate_checksum", "lpath" -> lpath(data))
		withAuth(HttpRequest(uri = objUri, method = HttpMethods.POST, entity = form.toEntity))

	private def parseHashsum(resp: HttpResponse): Future[Sha256Sum] =
		analyzeResponse(resp): respJs =>
			val checksum = respJs.convertTo[Checksum]
			Sha256Sum.fromBase64(checksum.checksum.stripPrefix("sha2:")).get

	private val basicAuthHeader = headers.Authorization(
		BasicHttpCredentials(config.username, config.password)
	)

	def fetchToken(): Future[String] =
		val req = HttpRequest(uri = authUri, headers = Seq(basicAuthHeader), method = HttpMethods.POST)
		http.singleRequest(req).flatMap(extractTextResponse)

	private var authToken: Future[String] =
		Future.failed(new CpDataException("not initialized yet"))

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

	private def failIfNotSuccess(resp: HttpResponse): Future[Done] =
		analyzeResponse(resp)(_ => Done)

	private def extractTextResponse(resp: HttpResponse): Future[String] =
		Unmarshal(resp).to[String].flatMap: body =>
			if resp.status.isSuccess && !resp.status.isRedirection then
				Future.successful(body.trim)
			else
				val msg = if body.trim.isEmpty then resp.status.value else body.trim
				Future.failed(new CpDataException(s"iRODS error (HTTP ${resp.status.intValue}): $msg"))

	private def analyzeResponse[T](resp: HttpResponse)(payloadParser: JsValue => T): Future[T] =
		Unmarshal(resp).to[String].flatMap: body =>
			val respJs = Try(body.parseJson)
			val irodsStatus = respJs.map(_.convertTo[Response].irods_response)
			if resp.status.isSuccess && !resp.status.isRedirection && irodsStatus.fold(_ => false, _.status_code == 0) then
				Future.fromTry(respJs).map(payloadParser)
			else
				val irodsMsg = irodsStatus.toOption.flatMap(_.status_message).getOrElse("").trim
				val irodsCode = irodsStatus.map(_.status_code.toString).getOrElse("")
				val msg = if irodsMsg.nonEmpty then irodsMsg else if body.trim.isEmpty then resp.status.value else body.trim
				Future.failed[T](new CpDataException(s"iRODS error ${irodsCode} (HTTP ${resp.status.intValue}): $msg"))

end IRODSClient

object IRODSClient extends DefaultJsonProtocol:
	val ChunkSize = 1 << 25 // 32 MB

	case class DobjStats(`type`: String, size: Long, checksum: String)
	private case class EntryList(entries: Seq[String])
	private case class Checksum(checksum: String)
	private case class Status(status_code: Int, status_message: Option[String])
	private case class Response(irods_response: Status)
	case class ParWriteHandle(parallel_write_handle: String)

	private val vanillaStrSeqFmt = summon[RootJsonFormat[Seq[String]]]

	private given RootJsonFormat[EntryList] =
		given RootJsonFormat[Seq[String]] with
			def read(json: JsValue): Seq[String] = json match
				case JsNull => Nil
				case nonNull => vanillaStrSeqFmt.read(nonNull)
			def write(obj: Seq[String]): JsValue = vanillaStrSeqFmt.write(obj)
		jsonFormat1(EntryList.apply)
	private given RootJsonFormat[Checksum]  = jsonFormat1(Checksum.apply)
	private given RootJsonFormat[Status]    = jsonFormat2(Status.apply)
	private given RootJsonFormat[Response]  = jsonFormat1(Response.apply)
	private given RootJsonFormat[DobjStats] = jsonFormat3(DobjStats.apply)
	private given RootJsonFormat[ParWriteHandle] = jsonFormat1(ParWriteHandle.apply)

	def concatByteStrings(bss: Seq[ByteString]): ByteString =
		bss.foldLeft(ByteString.newBuilder)(_ ++= _).result

	def readPages(size: Long, chunkSize: Int): Iterator[(Long, Int)] =
		assert(size > 0, "file size must be positive")
		(Iterator
			.iterate(0L)(_ + chunkSize)
			.takeWhile(_ < size)
			++ Iterator.single(size)
		)
		.sliding(2)
		.map: pair =>
			pair(0) -> (pair(1) - pair(0)).toInt

end IRODSClient
