package se.lu.nateko.cp.data

import java.io.File
import java.net.URI

import scala.collection.immutable.Seq
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import akka.Done
import akka.NotUsed
import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.Http.HostConnectionPool
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.sprayJsonMarshaller
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.FormData
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.RequestEntity
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.headers.Cookie
import akka.http.scaladsl.model.headers.HttpCookiePair
import akka.http.scaladsl.model.headers.`Set-Cookie`
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.CommonJsonSupport
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

object MassUpload extends CommonJsonSupport{

	val parall = 8
	val Username = "test@upload"
	val Producer = "http://meta.icos-cp.eu/resources/organizations/WDCGG"
	val ObjSpec = "http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject"
	val LoginUrl = "https://cpauth.icos-cp.eu/password/login"
	val RootFolder = "/disk/data/wdcgg"

	case class UploadMetadataDto(
		hashSum: Sha256Sum,
		submitterId: String,
		producingOrganization: URI,
		objectSpecification: URI,
		fileName: String
	)

	case class FileInfo(file: File, hash: Sha256Sum)

	implicit val system = ActorSystem("massUpload")
	import system.dispatcher
	implicit val materializer = ActorMaterializer(namePrefix = Some("massUpload_mat"))
	implicit val uploadMetadataDtoFormat = jsonFormat5(UploadMetadataDto)
	private val http = Http()
	var cookie = HttpCookiePair("dummy", "dummy")

	type HttpFlow[T] = Flow[(HttpRequest, T), (Try[HttpResponse], T), HostConnectionPool]
	type StepResult[T] = (T, Option[String])

	def metaHttp[T]: HttpFlow[T] = http.cachedHostConnectionPoolHttps("meta.icos-cp.eu")
	def dataHttp[T]: HttpFlow[T] = http.cachedHostConnectionPoolHttps("data.icos-cp.eu")

	//def metaHttp[T]: HttpFlow[T] = http.cachedHostConnectionPool("127.0.0.1", 9094)
	//def dataHttp[T]: HttpFlow[T] = http.cachedHostConnectionPool("127.0.0.1", 9010)
	
	val fileSource: Source[File, NotUsed] = {
		def getFiles(folder: File): Seq[File] = {
			val children = Seq(folder.listFiles :_*)
			children.filter(_.isFile) ++ children.filter(_.isDirectory).flatMap(getFiles)
		}
		Source(getFiles(new File(RootFolder)))
	}

	val fileInfoSource: Source[FileInfo, NotUsed] = fileSource.mapAsyncUnordered(parall){file =>
		FileIO.fromFile(file)
			.viaMat(DigestFlow.sha256)(Keep.right)
			.to(Sink.ignore).run()
			.map(hash => FileInfo(file, hash))
	}

	val metaSubmittingFlow: Flow[FileInfo, StepResult[FileInfo], NotUsed] = Flow[FileInfo]
		.mapAsyncUnordered(parall){metaSubmission}
		.via(metaHttp)
		.via(uploadResultControl)

	val fileUploadingFlow: Flow[FileInfo, StepResult[FileInfo], NotUsed] = Flow[FileInfo]
		.map(fileSubmission)
		.via(dataHttp)
		.via(uploadResultControl)

	val fileDumpingFlow: Flow[File, StepResult[File], NotUsed] = Flow[File]
		.map(fileDumping)
		.via(dataHttp)
		.via(uploadResultControl)

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

	def dumpFiles = fileSource.via(fileDumpingFlow).runWith(resultLogger(f => s"Dumping ${f.getName}"))

	def submitFiles = fileInfoSource
		.via(metaSubmittingFlow)
		.alsoTo(resultLogger(f => s"Meta upload ${f.file.getName}"))
		.collect{case (fi, None) => fi}
		.via(fileUploadingFlow)
		.runWith(resultLogger(f => s"File upload ${f.file.getName}"))

	private def uploadResultControl[T]: Flow[(Try[HttpResponse], T), StepResult[T], NotUsed] = Flow[(Try[HttpResponse], T)]
		.mapAsyncUnordered(parall){
			case (Success(resp), payload) if resp.status == StatusCodes.OK =>
				Future.successful((payload, None))
			case (Success(resp), payload) =>
				resp.entity.toStrict(2 second)
					.map(": " + _.data.utf8String)
					.recover{case _ => ""}
					.map{ responseText =>
						val msg = resp.status.defaultMessage + responseText
						(payload, Some(msg))
					}
			case (Failure(err), payload) =>
				Future.successful((payload, Some(err.getMessage)))
		}

	private def resultLogger[T](toStr: T => String): Sink[StepResult[T], Future[Done]] = Sink.foreach{
		case (t, None) => system.log.info(toStr(t))
		case (t, Some(msg)) => system.log.error(toStr(t) + ": " + msg)
	}

	private def metaSubmission(fileInfo: FileInfo): Future[(HttpRequest, FileInfo)] = {
		val meta = UploadMetadataDto(
			hashSum = fileInfo.hash,
			submitterId = "CP",
			fileName = fileInfo.file.getName,
			producingOrganization = new URI(Producer),
			objectSpecification = new URI(ObjSpec)
		)

		Marshal(meta).to[RequestEntity]
			.map{entity => (
				HttpRequest(
					method = HttpMethods.POST,
					uri = Uri("/upload"),
					headers = Seq(Cookie(cookie)),
					entity = entity
				),
				fileInfo
			)}
	}

	private def fileUpload(file: File, pathSuffix: String): HttpRequest = {
		val entity = HttpEntity(ContentTypes.`application/octet-stream`, FileIO.fromFile(file))
		HttpRequest(
			method = HttpMethods.PUT,
			uri = Uri("/objects/" + pathSuffix),
			headers = Seq(Cookie(cookie)),
			entity = entity
		)
	}

	private def fileSubmission(fileInfo: FileInfo): (HttpRequest, FileInfo) =
		(fileUpload(fileInfo.file, fileInfo.hash.id), fileInfo)

	private def fileDumping(file: File): (HttpRequest, File) = (fileUpload(file, "dump"), file)

}
