package se.lu.nateko.cp.data

import java.io.File
import java.net.URI

import scala.collection.immutable.Seq
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Success

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.sprayJsonMarshaller
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.FormData
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.RequestEntity
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.headers.Cookie
import akka.http.scaladsl.model.headers.HttpCookiePair
import akka.http.scaladsl.model.headers.`Set-Cookie`
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.CommonJsonSupport
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

object MassUpload extends CommonJsonSupport{

	val Username = "test@upload"
	val Producer = "http://meta.icos-cp.eu/ontologies/cpmeta/CP"
	val ObjSpec = "http://meta.icos-cp.eu/ontologies/cpmeta/instances/co2WdcggDataObject"
	val LoginUrl = "https://cpauth.icos-cp.eu/password/login"
	val MetaSubmitUrl = "http://localhost:9094/upload"
	val FileSubmitUrl = "http://localhost:9010/objects/"
	val RootFolder = "/home/maintenance/Documents/CP/wdcgg/co2"

	case class UploadMetadataDto(
		hashSum: Sha256Sum,
		submitterId: String,
		producingOrganization: URI,
		objectSpecification: URI,
		fileName: String
	)

	implicit val system = ActorSystem("massUpload")
	import system.dispatcher
	implicit val materializer = ActorMaterializer(namePrefix = Some("massUpload_mat"))
	implicit val uploadMetadataDtoFormat = jsonFormat5(UploadMetadataDto)
	private val http = Http()
	var cookie: HttpCookiePair = _

	def processFiles() =
		Source(getFiles(new File(RootFolder)))
			.mapAsyncUnordered(2)(processFile)
			.runForeach(println)


	def getFiles(folder: File): Seq[File] = {
		val children = Seq(folder.listFiles :_*)
		children.filter(_.isFile) ++ children.filter(_.isDirectory).flatMap(getFiles)
	}

	def makeMeta(file: File): Future[UploadMetadataDto] = {
		val hashFut = FileIO.fromFile(file)
			.viaMat(DigestFlow.sha256)(Keep.right)
			.to(Sink.ignore).run()

		hashFut.map{hash =>
println(s"Submitting ${file.getName} with hash ${hash.id}")
			UploadMetadataDto(
				hashSum = hash,
				submitterId = "CP",
				fileName = file.getName,
				producingOrganization = new URI(Producer),
				objectSpecification = new URI(ObjSpec)
			)
		}
	}

	def initAuthCookie(password: String): Future[HttpCookiePair] =
		Marshal(FormData(Uri.Query("mail" -> Username, "password" -> password)))
			.to[RequestEntity]
			.map{entity =>
				HttpRequest(
					method = HttpMethods.POST,
					uri = Uri(LoginUrl),
					entity = entity
				)
			}
			.flatMap(http.singleRequest(_))
			.map{
				_.headers.collectFirst{
					case `Set-Cookie`(cookie) => cookie.pair
				}.get
			}
			.andThen{
				case Success(pair) => cookie = pair
			}

	def submitMeta(meta: UploadMetadataDto): Future[String] =
		Marshal(meta).to[RequestEntity]
			.map{entity =>
				HttpRequest(
					method = HttpMethods.POST,
					uri = Uri(MetaSubmitUrl),
					headers = Seq(Cookie(cookie)),
					entity = entity
				)
			}
			.flatMap(http.singleRequest(_))
			.flatMap(_.entity.toStrict(1 second))
			.map(_.data.decodeString("UTF-8"))

	def submitFile(file: File, hash: Sha256Sum): Future[String] = {
		val entity = HttpEntity(ContentTypes.`application/octet-stream`, FileIO.fromFile(file))
		http.singleRequest(
			HttpRequest(
				method = HttpMethods.PUT,
				uri = Uri(FileSubmitUrl + hash.id),
				headers = Seq(Cookie(cookie)),
				entity = entity
			)
		)
		.flatMap(_.entity.toStrict(1 second))
		.map(_.data.decodeString("UTF-8"))
	}

	def processFile(file: File): Future[String] = {
		(for(
			meta <- makeMeta(file);
			resMeta <- submitMeta(meta);
			resFile <- submitFile(file, meta.hashSum)
		) yield resFile)
		.recover{
			case exc: Throwable => exc.getMessage
		}
	}

}
