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
import akka.NotUsed
import akka.stream.scaladsl.Flow
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.Http.HostConnectionPool
import scala.util.Try
import akka.http.scaladsl.model.StatusCodes
import scala.util.Failure

object MassUpload extends CommonJsonSupport{

	val Username = "test@upload"
	val Producer = "http://meta.icos-cp.eu/ontologies/cpmeta/instances/WDCGG"
	val ObjSpec = "http://meta.icos-cp.eu/ontologies/cpmeta/instances/wdcggDataObject"
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
	type ConnFlow = Flow[HttpRequest, HttpResponse, Future[Http.OutgoingConnection]]

	def metaHttp[T]: HttpFlow[T] = http.cachedHostConnectionPoolHttps("meta.icos-cp.eu")
	def dataHttp[T]: HttpFlow[T] = http.cachedHostConnectionPoolHttps("data.icos-cp.eu")
	def dataConn: ConnFlow = http.outgoingConnectionHttps("data.icos-cp.eu")

	//def metaHttp[T]: HttpFlow[T] = http.cachedHostConnectionPool("127.0.0.1", 9094)
	//def dataHttp[T]: HttpFlow[T] = http.cachedHostConnectionPool("127.0.0.1", 9010)
	//def dataConn: ConnFlow = http.outgoingConnection("127.0.0.1", 9010)
	
	val fileSource: Source[File, Future[Int]] = {
		def getFiles(folder: File): Seq[File] = {
			val children = Seq(folder.listFiles :_*)
			children.filter(_.isFile) ++ children.filter(_.isDirectory).flatMap(getFiles)
		}
		val files = getFiles(new File(RootFolder))
		Source(files).mapMaterializedValue(_ => Future.successful(files.size))
	}

	val metaSubmittingFlow: Flow[File, FileInfo, NotUsed] = Flow[File]
		.mapAsyncUnordered(8){file =>
			val hashFut = FileIO.fromFile(file)
				.viaMat(DigestFlow.sha256)(Keep.right)
				.to(Sink.ignore).run()
			hashFut.flatMap(hash => metaSubmission(FileInfo(file, hash)))
		}
		.via(metaHttp)
		.collect{
			case (Success(resp), fileInfo) if resp.status == StatusCodes.OK => fileInfo
		}

	def count[T]: Sink[T, Future[Int]] = Sink.fold[Int, T](0)((c, _) => c + 1)

	def fileUploadingSink[T](uploader: T => (HttpRequest, T)): Sink[T, Future[Int]] = Flow[T]
		.map(uploader)
		.log("file upl.", _._2)
		.via(dataHttp)
		.log("Upload result", {
			case (Success(resp), t)  => s"${resp.status}: $t"
			case (Failure(err), t)  => s"{err.getMessage}: $t"
		})
		.collect{
			case (Success(resp), t) if resp.status == StatusCodes.OK => t
		}
		.toMat(count)(Keep.right)

	val fileDumpingSink: Sink[File, Future[Int]] = fileUploadingSink(fileDumping)

	def dumpFiles: Future[(Int, Int)] = fileSource.toMat(fileDumpingSink)(_ zip _).run()

	def dumpFilesConn = fileSource
		.log("File")
		.map(fileDump).viaMat(dataConn)(Keep.right)
		.mapAsync(8)(resp => resp.entity.toStrict(1 second))
		.map(_.data.utf8String)
		.log("Response")
		.toMat(count)(Keep.both).run()

	def getMany = Source(1 to 1000).map(_ => HttpRequest(uri = "/portal/")).via(dataConn)
		.map(x => {println(x.status); x})
		.mapAsync(1)(resp => resp.entity.toStrict(1 second))
		.map(_.data.utf8String)
		.runWith(count)

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

	def metaSubmission(fileInfo: FileInfo): Future[(HttpRequest, FileInfo)] = {
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

	def fileUpload(file: File, pathSuffix: String): HttpRequest = {
		val entity = HttpEntity(ContentTypes.`application/octet-stream`, FileIO.fromFile(file))
		HttpRequest(
			method = HttpMethods.PUT,
			uri = Uri("/objects/" + pathSuffix),
			headers = Seq(Cookie(cookie)),
			entity = entity
		)
	}

	def fileDump(file: File): HttpRequest = fileUpload(file, "dump")

	def fileSubmission(fileInfo: FileInfo): (HttpRequest, FileInfo) =
		(fileUpload(fileInfo.file, fileInfo.hash.id), fileInfo)

	def fileDumping(file: File): (HttpRequest, File) = (fileDump(file), file)

}
