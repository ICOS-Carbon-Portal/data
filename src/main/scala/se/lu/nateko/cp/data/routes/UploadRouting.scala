package se.lu.nateko.cp.data.routes

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.{Failure, Success, Try}
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model._
import akka.http.scaladsl.model.headers._
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.ExceptionHandler
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.unmarshalling.Unmarshaller
import akka.stream.Materializer
import se.lu.nateko.cp.data.api.UnauthorizedUpload
import se.lu.nateko.cp.data.api.UploadUserError
import se.lu.nateko.cp.data.services.upload.UploadResult
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.crypto.JsonSupport._
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data._
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.JsonSupport.ingestionMetadataExtractFormat
import spray.json._

class UploadRouting(authRouting: AuthRouting, uploadService: UploadService, coreConf: MetaCoreConfig)(implicit mat: Materializer) {
	import UploadRouting._
	import authRouting._

	private implicit val ex = mat.executionContext
	private implicit val envriConfs = coreConf.envriConfigs
	private implicit val uriFSU = Unmarshaller[String, Uri](_ => s => Future.fromTry(Try(Uri(s))))

	private val log = uploadService.log
	private val extractEnvri = extractEnvriDirective
	private val extractEnvriSoft = extractEnvriDirective


	private val upload: Route = (requireShaHash & userRequired & extractRequest){ (hashsum, uid, req) =>
		extractEnvri{implicit envri =>
			val resFuture: Future[UploadResult] = uploadService
				.getSink(hashsum, uid)
				.flatMap(req.entity.dataBytes.runWith)

			addAccessControlHeaders(envri){
				onSuccess(resFuture)(res => res.makeReport match{
					case Right(report) => complete(report)
					case Left(errorMsg) =>
						log.warning(errorMsg)
						complete((StatusCodes.InternalServerError, errorMsg))
				})
			}
		}
	}

	private val reIngest: Route = (requireShaHash & userRequired & extractRequest){ (hashsum, uid, req) =>
		extractEnvri{implicit envri =>
			req.discardEntityBytes()
			onSuccess(uploadService.reingest(hashsum, uid)){_ =>
				complete(StatusCodes.OK)
			}
		}
	}

	private val tryIngest: Route = extractEnvri{implicit envri =>
		addAccessControlHeaders(envri){
			parameters(("specUri".as[Uri], "nRows".as[Int].?)){(specUri, nRowsOpt) =>
				extractRequest { req =>
					val resFut = uploadService.getTryIngestSink(specUri, nRowsOpt).flatMap(req.entity.dataBytes.runWith)
					onComplete(resFut) {
						case Success(metaExtract) => complete(metaExtract.toJson)
						case Failure(err) => complete(StatusCodes.BadRequest -> err.getMessage)
					}
				}
			} ~
			complete(StatusCodes.BadRequest -> "Expected object species URI as 'specUri' query parameter, and optionally number of rows as 'nRows'")
		}
	}

	private val uploadHttpOptions: Route =
		extractEnvri{envri =>
			addAccessControlHeaders(envri){
				respondWithHeaders(
					`Access-Control-Allow-Methods`(HttpMethods.PUT),
					`Access-Control-Allow-Headers`(`Content-Type`.name)
				){
					complete(StatusCodes.OK)
				}
			}
		}

	private val errHandler = ExceptionHandler{
		//TODO Handle the case of data object metadata not found, and the case of metadata service being down
		case authErr: UnauthorizedUpload => reportError(StatusCodes.Unauthorized, authErr)
		case userErr: UploadUserError => reportError(StatusCodes.BadRequest, userErr)
		case err => reportError(StatusCodes.InternalServerError, err)
	}

	private def reportError(code: StatusCode, err: Throwable): Route = {
		val plainError = complete(code -> err.getMessage)
		extractEnvriSoft{envri =>
			addAccessControlHeaders(envri){plainError}
		} ~ plainError
	}

	private def addAccessControlHeaders(envri: Envri): Directive0 = optionalHeaderValueByType[Origin](()).flatMap{
		case Some(origin) if origin.value.contains(envriConfs(envri).metaHost) =>
			respondWithHeaders( //allowing uploads from meta-hosted browser web apps
				`Access-Control-Allow-Origin`(origin.value), `Access-Control-Allow-Credentials`(true)
			)
		case _ => pass
	}

	val route = handleExceptions(errHandler){
		pathPrefix(objectPathPrefix.stripSuffix("/")){
			withRequestTimeout(3.minutes){
				put{ upload } ~
				post{ reIngest }
			} ~
			options{ uploadHttpOptions }
		} ~
		path("tryingest"){
			put{ tryIngest } ~
			options { uploadHttpOptions }
		}
	}

}

object UploadRouting{

	val Sha256Segment = Segment.flatMap(Sha256Sum.fromString(_).toOption)

	val requireShaHash: Directive1[Sha256Sum] = path(Sha256Segment.?).flatMap{
		case Some(hash) => provide(hash)
		case None => complete(StatusCodes.BadRequest -> s"Expected base64Url- or hex-encoded SHA-256 hash")
	}

	def extractEnvriDirective(implicit configs: EnvriConfigs): Directive1[Envri] = extractHost.flatMap{h =>
		Envri.infer(h) match{
			case None => complete(StatusCodes.BadRequest -> s"Unexpected host $h, cannot find corresponding ENVRI")
			case Some(envri) => provide(envri)
		}
	}

	def extractEnvriDirectiveSoft(implicit configs: EnvriConfigs): Directive1[Envri] = extractHost.flatMap{h =>
		Envri.infer(h) match{
			case None => reject
			case Some(envri) => provide(envri)
		}
	}
}
