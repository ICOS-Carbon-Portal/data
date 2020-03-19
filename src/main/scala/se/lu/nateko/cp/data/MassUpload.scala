package se.lu.nateko.cp.data

import java.io.File
import java.net.URI
import java.nio.file.Path

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
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model._
import akka.http.scaladsl.model.headers._
import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.meta.core.CommonJsonSupport
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.crypto.JsonSupport._

object MassUpload extends CommonJsonSupport{

	val parall = 8
	val Username = "uploader@CP"
	val ObjSpec = new URI("http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject")
	val LoginUrl = "https://cpauth.icos-cp.eu/password/login"
	val RootFolder = "/disk/data/wdcgg/"

	def getWdcggStation(name: String) =
		new URI("http", "meta.icos-cp.eu", "/resources/wdcgg/station/" + name, null)

	case class UploadMetadataDto(
		hashSum: Sha256Sum,
		submitterId: String,
		objectSpecification: URI,
		fileName: String,
		specificInfo: Map[String, URI]
	)

	case class FileInfo(file: Path, hash: Sha256Sum, stationName: String){
		def fileName: String = file.toFile.getName
	}

	implicit val system = ActorSystem("massUpload")
	import system.dispatcher
	implicit val uploadMetadataDtoFormat = jsonFormat5(UploadMetadataDto)
	private val http = Http()
	var cookie = HttpCookiePair("dummy", "dummy")

	type HttpFlow[T] = Flow[(HttpRequest, T), (Try[HttpResponse], T), HostConnectionPool]
	type StepResult[T] = (T, Option[String])

//	def metaHttp[T]: HttpFlow[T] = http.cachedHostConnectionPoolHttps("meta.icos-cp.eu")
//	def dataHttp[T]: HttpFlow[T] = http.cachedHostConnectionPoolHttps("data.icos-cp.eu")

	def metaHttp[T]: HttpFlow[T] = http.cachedHostConnectionPool("127.0.0.1", 9094)
	def dataHttp[T]: HttpFlow[T] = http.cachedHostConnectionPool("127.0.0.1", 9010)
	
	val fileSource: Source[Path, NotUsed] = {
		def getFiles(folder: File): Seq[File] = {
			val children = folder.listFiles.toIndexedSeq
			children.filter(_.isFile) ++ children.filter(_.isDirectory).flatMap(getFiles)
		}
		Source(getFiles(new File(RootFolder))).map(_.toPath)
	}

//	val fileInfoSource: Source[FileInfo, NotUsed] = fileSource.mapAsyncUnordered(parall){path =>
//		val hashFut = FileIO.fromPath(path)
//			.viaMat(DigestFlow.sha256)(Keep.right)
//			.to(Sink.ignore).run()
//		val headerFut = FileIO.fromPath(path)
//			.via(WdcggStreams.linesFromBinary)
//			.toMat(WdcggStreams.wdcggHeaderSink)(Keep.right).run()
//		for(hash <- hashFut; header <- headerFut) yield {
//			val stationName = header("STATION NAME")
//			FileInfo(path, hash, stationName)
//		}
//	}

	val metaSubmittingFlow: Flow[FileInfo, StepResult[FileInfo], NotUsed] = Flow[FileInfo]
		.mapAsyncUnordered(parall){metaSubmission}
		.via(metaHttp)
		.via(uploadResultControl)

	val fileUploadingFlow: Flow[FileInfo, StepResult[FileInfo], NotUsed] = Flow[FileInfo]
		.map(fileSubmission)
		.via(dataHttp)
		.via(uploadResultControl)

	val fileDumpingFlow: Flow[Path, StepResult[Path], NotUsed] = Flow[Path]
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

	def dumpFiles = fileSource.via(fileDumpingFlow).runWith(resultLogger(f => s"Dumping ${f.getFileName}"))

//	def submitFiles = fileInfoSource
//		.via(metaSubmittingFlow)
//		.alsoTo(resultLogger(f => s"Meta upload ${f.fileName}"))
//		.collect{case (fi, None) => fi}
//		.via(fileUploadingFlow)
//		.runWith(resultLogger(f => s"File upload ${f.fileName}"))

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
			fileName = fileInfo.file.toFile.getName,
			objectSpecification = ObjSpec,
			specificInfo = Map("station" -> getWdcggStation(fileInfo.stationName))
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

	private def fileUpload(file: Path, pathSuffix: String): HttpRequest = {
		val entity = HttpEntity(ContentTypes.`application/octet-stream`, FileIO.fromPath(file))
		HttpRequest(
			method = HttpMethods.PUT,
			uri = Uri("/objects/" + pathSuffix),
			headers = Seq(Cookie(cookie)),
			entity = entity
		)
	}

	private def fileSubmission(fileInfo: FileInfo): (HttpRequest, FileInfo) =
		(fileUpload(fileInfo.file, fileInfo.hash.id), fileInfo)

	private def fileDumping(file: Path): (HttpRequest, Path) = (fileUpload(file, "dump"), file)

}
