package se.lu.nateko.cp.data.routes

import scala.concurrent.Future

import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directive
import akka.http.scaladsl.server.ExceptionHandler
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.ContentTypeResolver
import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import se.lu.nateko.cp.data.api.UnauthorizedUpload
import se.lu.nateko.cp.data.api.UploadUserError
import se.lu.nateko.cp.data.services.upload.UploadResult
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum


class UploadRouting(authRouting: AuthRouting, uploadService: UploadService)(implicit mat: Materializer) {
	import UploadRouting._

	private implicit val ex = mat.executionContext

	private val upload: Route = path(Sha256Segment){ hashsum =>
		authRouting.user{ uinfo =>
			extractRequest{ req =>
				val resFuture: Future[UploadResult] = uploadService
					.getSink(hashsum, uinfo)
					.flatMap(req.entity.dataBytes.runWith)

				onSuccess(resFuture){res =>
					complete(s"The data object is available at ${res.makeReport}")
				}
			}
		}
	} ~ (path("dump") & extractRequest) { req =>
		val doneFut = req.entity.dataBytes.runWith(Sink.ignore)
		onSuccess(doneFut){ done =>
			complete(StatusCodes.OK)
		}
	} ~ requireShaHash

	private val download: Route = pathPrefix(Sha256Segment){ hashsum =>
		val file = uploadService.getFile(hashsum)

		if(file.exists){
			optionalFileName{fileNameOpt =>
				getFromFile(file, getContentType(fileNameOpt))
			}
		} else onSuccess(uploadService.getRemoteStorageSource(hashsum)){src =>
			optionalFileName{fileNameOpt =>
				val contentType = getContentType(fileNameOpt)
				val entity = HttpEntity.CloseDelimited(contentType, src)
				complete(HttpResponse(entity = entity))
			}
		}
	} ~ requireShaHash

	val route = pathPrefix("objects"){
		handleExceptions(errHandler){
			put{ upload } ~
			get{ download }
		}
	}
}

object UploadRouting{

	private val Sha256Segment = Segment.flatMap(Sha256Sum.fromString(_).toOption)

	private val requireShaHash =
		complete((StatusCodes.BadRequest, s"Expected base64Url- or hex-encoded SHA-256 hash"))

	private val optionalFileName: Directive1[Option[String]] = Directive{nameToRoute =>
		pathEndOrSingleSlash{
			nameToRoute(Tuple1(None))
		} ~
		path(Segment?){segmOpt =>
			nameToRoute(Tuple1(segmOpt))
		}
	}

	private val errHandler = ExceptionHandler{
		//TODO Handle the case of data object metadata not found, and the case of metadata service being down
		case authErr: UnauthorizedUpload =>
			complete((StatusCodes.Unauthorized, authErr.getMessage))
		case userErr: UploadUserError =>
			complete((StatusCodes.BadRequest, userErr.getMessage))
		case err => throw err
	}

	def getContentType(fileName: String): ContentType = {
		val contentResolver = implicitly[ContentTypeResolver]
		contentResolver(fileName)
	}

	private def getContentType(fileName: Option[String]): ContentType =
		fileName.map(getContentType).getOrElse(ContentTypes.`application/octet-stream`)

}
