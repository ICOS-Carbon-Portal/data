package se.lu.nateko.cp.data.routes

import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success
import scala.util.Try
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import akka.stream.Materializer
import se.lu.nateko.cp.data.services.UploadService
import akka.http.scaladsl.server.directives.ContentTypeResolver
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.server.ValidationRejection
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.Connection
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import akka.http.scaladsl.server.ExceptionHandler
import se.lu.nateko.cp.data.api.UploadUserError
import se.lu.nateko.cp.data.api.UnauthorizedUpload

class UploadRouting(authRouting: AuthRouting, uploadService: UploadService)(implicit mat: Materializer) {
	import UploadRouting._

	private implicit val ex = mat.executionContext

	private val upload: Route = path(Sha256Segment){ hashsum =>
		authRouting.user{ uinfo =>
			extractRequest{ req =>
				val pidFuture: Future[String] = uploadService
					.getSink(hashsum, uinfo)
					.flatMap(req.entity.dataBytes.runWith)

				onSuccess(pidFuture){pid =>
					complete(s"The data object is available at http://dx.doi.org/$pid")
				}
			}
		}
	} ~ requireShaHash

	private val download: Route = pathPrefix(Sha256Segment){ hashsum =>
		val file = uploadService.getFile(hashsum)

		pathEnd{
			getFromFile(file, ContentTypes.`application/octet-stream`)
		} ~
		path(Segment)(fileName => {
			val contentResolver = implicitly[ContentTypeResolver]
			val contentType = contentResolver(fileName)
			getFromFile(file, contentType)
		}) ~
		complete(StatusCodes.NotFound)
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

	private val errHandler = ExceptionHandler{
		//TODO Handle the case of data object metadata not found, and the case of metadata service being down
		case authErr: UnauthorizedUpload =>
			complete((StatusCodes.Unauthorized, authErr.getMessage))
		case userErr: UploadUserError =>
			complete((StatusCodes.BadRequest, userErr.getMessage))
		case err => throw err
	}
}
