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
import spray.json._

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

sealed trait B2StageItem{
	def name: String
	def path: String
}

case class IrodsColl(name: String, parent: Option[IrodsColl] = Some(B2StageItem.Root)) extends B2StageItem{
	def path = parent.fold("")(_.path + "/") + name
}

case class IrodsData(name: String, parent: IrodsColl) extends B2StageItem{
	def path = s"${parent.path}/$name"
}

object B2StageItem extends DefaultJsonProtocol{

	val Root = IrodsColl("", None)

	case class ApiResponseItem(dataName: Option[String], collectionName: String)
	type ApiResponse = Array[ApiResponseItem]

	implicit val apiResponseItemFormat = jsonFormat2(ApiResponseItem)
	implicit val apiResponseFormat: RootJsonReader[ApiResponse] = arrayFormat[ApiResponseItem]

	private def toCollection(apiPath: String): IrodsColl = {
		def makeColl(segments: List[String]): IrodsColl = segments match{
			case Nil => Root
			case head :: tail => IrodsColl(head, Some(makeColl(tail)))
		}
		//TODO Get rid of the hard-coded path prefix
		val trimmed = apiPath.stripPrefix("/eudat.fi/home/oleg").stripPrefix("/")
		makeColl(trimmed.split("/").reverse.filterNot(_.isEmpty).toList)
	}

	def toB2StageItem(item: ApiResponseItem): B2StageItem = {
		val coll = toCollection(item.collectionName)
		item.dataName.fold[B2StageItem](coll)(IrodsData(_, coll))
	}
}

object B2Playground{
	import akka.actor.ActorSystem
	import akka.stream.ActorMaterializer
	import scala.concurrent.Await
	import scala.concurrent.duration.DurationInt
	import se.lu.nateko.cp.data.ConfigReader

	implicit private val system = ActorSystem("B2StageClient")
	system.log
	implicit private val materializer = ActorMaterializer(namePrefix = Some("B2StageClient_mat"))
	implicit val dispatcher = system.dispatcher
	private val http = akka.http.scaladsl.Http()

	def stop() = system.terminate()

	val default = new B2StageClient(ConfigReader.getDefault.upload.b2stage, http)

	def list(path: String, parent: Option[IrodsColl] = Some(B2StageItem.Root)) = {
		val items = Await.result(default.list(IrodsColl(path, parent)), 5.seconds)
		items.foreach(println)
		items
	}

	def testUpload(name: String, nMb: Long, viaSink: Boolean, parent: IrodsColl = B2StageItem.Root) = {
		val mb = ByteString(Array.ofDim[Byte](1 << 20))
		val dobj = IrodsData(name, parent)

		val src = Source.repeat(mb).take(nMb)//.delay(200.milli, OverflowStrategy.backpressure)

		val start = System.currentTimeMillis

		val hash = if(viaSink)
			Await.result(src.runWith(default.objectSink(dobj)), 3.minute)
		else
			Await.result(default.uploadObject(dobj, src), 3.minute)

		val elapsed = System.currentTimeMillis - start
		println(s"SHA256 = $hash, elapsed $elapsed ms")
	}

	def testDownload(name: String, parent: IrodsColl = B2StageItem.Root): Unit = {
		val lfut = default.downloadObjectOnce(IrodsData(name, parent)).flatMap(
			_.runFold(0L)((sum, bs) => {println(sum); sum + bs.length})
		)
		val start = System.currentTimeMillis
		val size = Await.result(lfut, 3.minute)
		val elapsed = System.currentTimeMillis - start
		println(s"Size $size, elapsed $elapsed ms")
	}
}
