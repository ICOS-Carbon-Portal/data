package se.lu.nateko.cp.data.routes

import scala.concurrent.Future

import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.`Content-Disposition`
import akka.http.scaladsl.model.headers.`X-Forwarded-For`
import akka.http.scaladsl.model.headers.ContentDispositionTypes
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directive
import akka.http.scaladsl.server.ExceptionHandler
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.ContentTypeResolver
import akka.stream.Materializer
import se.lu.nateko.cp.data.api.UnauthorizedUpload
import se.lu.nateko.cp.data.api.UploadUserError
import se.lu.nateko.cp.data.services.upload.UploadResult
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.data.api.RestHeartClient
import scala.util.Success


class UploadRouting(authRouting: AuthRouting, uploadService: UploadService, restHeart: RestHeartClient)(implicit mat: Materializer) {
	import UploadRouting._
	import LicenceRouting.LicenceCookieName
	import authRouting._

	private implicit val ex = mat.executionContext
	private val log = uploadService.log

	private val upload: Route = path(Sha256Segment){ hashsum =>
		forbidAuthenticationFailures{
			user{ uid =>
				extractRequest{ req =>
					val resFuture: Future[UploadResult] = uploadService
						.getSink(hashsum, uid)
						.flatMap(req.entity.dataBytes.runWith)

					onSuccess(resFuture)(res => res.makeReport match{
						case Right(report) => complete(report)
						case Left(errorMsg) =>
							log.warning(errorMsg)
							complete((StatusCodes.InternalServerError, errorMsg))
					})
				}
			}
		}
	} ~ requireShaHash

	private val download: Route = pathPrefix(Sha256Segment){ hashsum =>
		onSuccess(uploadService.lookupPackage(hashsum)){dobj =>
			val ok = accessRoute(dobj)
			cookie(LicenceCookieName){licCookie =>
				deleteCookie(LicenceCookieName){
					if(licCookie.value == hashsum.base64Url) (ok)
					else reject
				}
			} ~
			user{uid =>
				onComplete(restHeart.getUserLicenseAcceptance(uid)){
					case Success(true) => ok
					case _ => reject
				}
			} ~
			redirect("/licence/" + hashsum.base64Url, StatusCodes.Found)
		}
	} ~ requireShaHash

	val route = pathPrefix("objects"){
		handleExceptions(errHandler){
			put{ upload } ~
			get{ download }
		}
	}

	private def accessRoute(dobj: DataObject): Route = optionalFileName{pathFileNameOpt =>
		headerValueByType[`X-Forwarded-For`](()){ip =>
			extractLog{ log =>
				userOpt{uidOpt =>

					val fileName = dobj.fileName
					val contentType = getContentType(fileName)
					val file = uploadService.getFile(dobj)

					def logDownload(): Unit = {
						restHeart.logDownload(dobj, ip.value).failed.foreach(
							log.error(_, s"Failed logging download of ${dobj.hash} from $ip to RestHeart")
						)
						for(uid <- uidOpt){
							restHeart.saveDownload(dobj, uid).failed.foreach(
								log.error(_, s"Failed saving download of ${dobj.hash} to ${uid.email}'s user profile")
							)
						}
					}

					respondWithHeader(`Content-Disposition`(ContentDispositionTypes.attachment, Map("filename" -> fileName))){
						if(file.exists){
							logDownload()
							getFromFile(file, contentType)
						} else {
							val src = uploadService.getRemoteStorageSource(dobj)
							val entity = HttpEntity.CloseDelimited(contentType, src)
							logDownload()
							complete(HttpResponse(entity = entity))
						}
					}
				}
			}
		} ~
		complete((StatusCodes.BadRequest, "Missing 'X-Forwarded-For' header, bad reverse proxy configuration on the server"))
	}
}

object UploadRouting{

	val Sha256Segment = Segment.flatMap(Sha256Sum.fromString(_).toOption)

	private val requireShaHash =
		complete((StatusCodes.BadRequest, s"Expected base64Url- or hex-encoded SHA-256 hash"))

	private val optionalFileName: Directive1[Option[String]] = Directive{nameToRoute =>
		pathEndOrSingleSlash{
			nameToRoute(Tuple1(None))
		} ~
		path(Segment.?){segmOpt =>
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

}
