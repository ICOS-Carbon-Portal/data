package se.lu.nateko.cp.data.api

import se.lu.nateko.cp.data.B2StageConfig
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.model.Uri
import scala.concurrent.Future
import spray.json._
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.RequestEntity
import scala.concurrent.ExecutionContext
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.Materializer
import scala.util.Success
import akka.Done
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.StatusCodes
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.FileIO
import akka.util.ByteString
import java.nio.file.Paths

class B2StageClient(config: B2StageConfig, http: HttpExt)(implicit ctxt: ExecutionContext, mat: Materializer) {

	import B2StageClient._
	private[this] var token: String = ""
	def currentToken = token

	private val Seq(authUri, storageUri, registeredUri) = {
		import config._
		Seq(authEndpoint, RegisteredPrefix + storageEndpoint, RegisteredPrefix).map{ep => Uri(s"$host$ep")}
	}

	def getAuthToken: Future[String] = {
		val creds = JsObject(
			"username" -> JsString(config.username),
			"password" -> JsString(config.password)
		)

		for(
			entity <- Marshal(creds).to[RequestEntity];
			req = HttpRequest(uri = authUri, method = HttpMethods.POST, entity = entity);
			resp <- http.singleRequest(req);
			js <- Unmarshal(resp).to[JsValue]
		) yield{
			token = js.asJsObject.fields("Response").asJsObject.fields("data").asJsObject.fields("token") match{
				case JsString(s) => s
				case _ => throw new Exception("Expected the authentication token to be a json string")
			}
			token
		}
	}

	def listCollection(path: String): Future[Seq[B2SafeData]] = {

		withAuth(HttpRequest(uri = fromRelativePath(path)))
			.flatMap(parseJsIfOk)
			.map{js =>

				val entries = js.asJsObject.fields("Response").asJsObject.fields("data") match{
					case JsArray(elems) => elems
					case _ => throw new CpDataException("Expected B2SAFE data list to be a json array")
				}
	
				entries.map{djs =>
					val jo = djs.asJsObject.fields.values.head.asJsObject.fields

					def name(prop: String) = jo.get(prop) match {
						case Some(JsString(p)) => p
						case _ => throw new CpDataException("Expected B2SAFE data name to be a json string")
					}

					if(jo.contains("dataobject")) DataObject(name("dataobject")) else Collection(name("collection"))
				}.toIndexedSeq
			}
	}

	def createCollection(path: String): Future[Done] = {
		val instr = JsObject("path" -> JsString(config.storageEndpoint + path))

		Marshal(instr).to[RequestEntity].flatMap{entity =>
			withAuth(HttpRequest(uri = registeredUri, method = HttpMethods.POST, entity = entity))
		}.flatMap(failIfNotOk)
	}

	def uploadObject(path: String, source: Source[ByteString, Any]): Future[Done] = {

		val uri = fromRelativePath(path)
		val entity = HttpEntity.Chunked(ContentTypes.`application/octet-stream`, source.map(b => b))
		val req = HttpRequest(uri = uri, method = HttpMethods.PUT, entity = entity)

		withAuth(req).flatMap(failIfNotOk)
	}

	def downloadObject(path: String): Source[ByteString, Future[Done]] = Source.lazily(
		() => Source.fromFutureSource{

			val uri = fromRelativePath(path).withQuery(Uri.Query("download" -> "true"))
	
			withAuth(HttpRequest(uri = uri)).flatMap(resp => resp.status match{
				case StatusCodes.OK =>
					Future.successful(resp.entity.withoutSizeLimit.dataBytes)
				case _ =>
					failIfNotOk(resp).map(_ => Source.empty)
			})
		}
	).mapMaterializedValue(_.flatten.map(_ => Done))

	def delete(path: String): Future[Done] = withAuth(
		HttpRequest(uri = fromRelativePath(path), method = HttpMethods.DELETE)
	).flatMap(failIfNotOk)

	def exists(path: String): Future[Boolean] = withAuth(
		HttpRequest(uri = fromRelativePath(path))
	).flatMap(resp => resp.status match{
		case StatusCodes.NotFound =>
			resp.discardEntityBytes()
			Future.successful(false)
		case _ => failIfNotOk(resp).map(_ => true)
	})

	def withAuth(requestMaker: => HttpRequest): Future[HttpResponse] = {
		val req = requestMaker

		def request(token: String) = http.singleRequest(
			req.withHeaders(req.headers :+ Authorization(OAuth2BearerToken(token)))
		)

		request(token).flatMap(resp => resp.status match{

			case StatusCodes.Unauthorized =>
				resp.discardEntityBytes()
				getAuthToken.flatMap(request)
			case _ =>
				Future.successful(resp)
		})
	}

	private def fromRelativePath(path: String): Uri = storageUri.withPath(storageUri.path + path)

	private def parseJsIfOk(resp: HttpResponse): Future[JsValue] = resp.status match {
		case StatusCodes.OK => Unmarshal(resp).to[JsValue]
		case s =>
			resp.discardEntityBytes()
			Future.failed(new CpDataException(s.value))
	}

	private def failIfNotOk(resp: HttpResponse): Future[Done] = resp.status match {
		case StatusCodes.OK =>
			resp.discardEntityBytes()
			Future.successful(Done)
		case notOk =>
			Unmarshal(resp).to[JsValue].flatMap{jsv =>
				val msg = jsv.asJsObject.fields("Response").asJsObject.fields("errors") match{
					case JsNull => notOk.value
					case JsArray(errs) => errs.map{
						case JsString(err) => err
						case _ => "unrecognized error"
					}.mkString("; ")
					case _ => throw new CpDataException("Response.errors returned from B2STAGE API must be JSON null or array")
				}
				Future.failed(new CpDataException(msg))
			}
	}
}

object B2StageClient{
	val RegisteredPrefix = "/api/registered"

	import se.lu.nateko.cp.data.ConfigReader
	import akka.actor.ActorSystem
	import akka.stream.ActorMaterializer

	implicit private val system = ActorSystem("B2StageClient")
	system.log
	implicit private val materializer = ActorMaterializer(namePrefix = Some("B2StageClient_mat"))
	implicit val dispatcher = system.dispatcher
	private val http = akka.http.scaladsl.Http()

	def stop() = system.terminate()
	
	val default = new B2StageClient(ConfigReader.getDefault.upload.b2stage, http)

	def list(path: String) = default.listCollection(path).foreach(c => c.foreach(println))

	def testUpload() = {
		val filePath = "/home/oleg/Downloads/InGOS_Radon_fluxmap_v2.0_noah_2006-2012.nc"
		val src = FileIO.fromPath(Paths.get(filePath))
		default.uploadObject("/newdir/radon.nc", src)
	}

	def testDownload(): Future[Long] = {
		default.downloadObject("/newdir/radon.nc").runFold(0L)((sum, bs) => sum + bs.length)
	}

	sealed trait B2SafeData
	case class DataObject(path: String) extends B2SafeData
	case class Collection(path: String) extends B2SafeData
}
