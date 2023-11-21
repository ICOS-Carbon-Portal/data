package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.model.*
import akka.http.scaladsl.model.headers.*
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.ExceptionHandler
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.unmarshalling.Unmarshaller
import akka.stream.Materializer
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.util.ByteString
import se.lu.nateko.cp.data.api.UnauthorizedUpload
import se.lu.nateko.cp.data.api.UploadUserError
import se.lu.nateko.cp.data.services.upload.UploadResult
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.crypto.JsonSupport.given
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.JsonSupport.given
import se.lu.nateko.cp.meta.core.data.*
import spray.json.*

import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success
import scala.util.Try
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.meta.core.data.EnvriResolver

class UploadRouting(authRouting: AuthRouting, uploadService: UploadService, coreConf: MetaCoreConfig)(implicit mat: Materializer) {
	import UploadRouting._
	import authRouting._
	import DefaultJsonProtocol.*

	private given ExecutionContextExecutor = mat.executionContext
	private given envriConfs: Map[Envri,EnvriConfig] = coreConf.envriConfigs
	private given Unmarshaller[String,Uri] = Unmarshaller[String, Uri](_ => s => Future.fromTry(Try(Uri(s))))

	private val log = uploadService.log
	private val extractEnvri = extractEnvriDirective
	private val extractEnvriSoft = extractEnvriDirectiveSoft


	private val upload: Route = (requireShaHash & userRequired & extractRequest){ (hashsum, uid, req) =>
		extractEnvri{

			val watchedFlow = Flow.apply[ByteString].watchTermination()(Keep.right).mapMaterializedValue{
				_.onComplete{term =>
					term.failed.foreach{err =>
						log.error(err, s"Error while uploading $hashsum")
					}
					log.debug(s"Unlocking future uploads of $hashsum (watchedFlow)")
					uploadService.unlockUpload(hashsum)
				}
			}
			val resFuture: Future[UploadResult] = uploadService
				.getSink(hashsum, uid)
				.flatMap(req.entity.dataBytes.via(watchedFlow).runWith)
				.andThen{
					case _ =>
						log.debug(s"Unlocking future uploads of $hashsum (resFuture.andThen)")
						uploadService.unlockUpload(hashsum)
				}

			addAccessControlHeaders{
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
		extractEnvri{
			req.discardEntityBytes()
			onSuccess(uploadService.reingest(hashsum, uid)){_ =>
				complete(StatusCodes.OK)
			}
		}
	}

	private val tryIngest: Route = extractEnvri{
		addAccessControlHeaders{
			parameters("specUri".as[Uri], "nRows".as[Int].?, "varnames".as[List[String]].?){(specUri, nRowsOpt, varnames) =>
				extractRequest { req =>
					val resFut = uploadService.getTryIngestSink(specUri, nRowsOpt, varnames).flatMap(req.entity.dataBytes.runWith)
					onComplete(resFut) {
						case Success(metaExtract) => metaExtract match
							case me: IngestionMetadataExtract => complete(me.toJson)
							case s: String => complete(s)
						case Failure(err) => reportError(StatusCodes.BadRequest, err, withDetails = true)
					}
				}
			} ~
			complete(StatusCodes.BadRequest -> "Expected object species URI as 'specUri' query parameter, and optionally number of rows as 'nRows'")
		}
	}

	private val uploadHttpOptions: Route =
		extractEnvri{
			addAccessControlHeaders{
				respondWithHeaders(
					`Access-Control-Allow-Methods`(HttpMethods.PUT),
					`Access-Control-Allow-Headers`(`Content-Type`.name)
				){
					complete(StatusCodes.OK)
				}
			}
		}

	private val errHandlerPF = ExceptionHandler{
		//TODO Handle the case of data object metadata not found, and the case of metadata service being down
		case authErr: UnauthorizedUpload => reportError(StatusCodes.Unauthorized, authErr)
		case userErr: UploadUserError => reportError(StatusCodes.BadRequest, userErr)
		case err => reportError(StatusCodes.InternalServerError, err, withDetails = true, withLog = true)
	}.andThen: route =>
		extractEnvriSoft{
			addAccessControlHeaders:
				route
		} ~
		route


	private def reportError(code: StatusCode, err: Throwable, withDetails: Boolean = false, withLog: Boolean = false): Route =
		if withLog then log.error(err, s"Server responded with status code $code because of an exception")
		val msg = err.getMessage + (
			if !withDetails then ""
			else err.getStackTrace.map(_.toString).mkString("\n", "\n", "\n")
		)
		complete(code -> msg)

	private def addAccessControlHeaders(using envri: Envri): Directive0 = optionalHeaderValueByType(Origin).flatMap{
		case Some(origin) if origin.value.contains(envriConfs(envri).metaHost) =>
			respondWithHeaders( //allowing uploads from meta-hosted browser web apps
				`Access-Control-Allow-Origin`(origin.value), `Access-Control-Allow-Credentials`(true)
			)
		case _ => pass
	}

	val route = handleExceptions(errHandlerPF){
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
		case None => complete(StatusCodes.BadRequest -> "Expected base64Url- or hex-encoded SHA-256 hash")
	}

	type EnvriDirective = (Envri ?=> Route) => Route

	def envriDirective(akkaDir: Directive1[Envri]): EnvriDirective =
		inner => akkaDir.apply(envri => inner(using envri))

	def extractEnvriDirective(using EnvriConfigs): EnvriDirective = envriDirective(extractEnvriAkkaDirective)

	def extractEnvriAkkaDirective(using EnvriConfigs): Directive1[Envri] = extractHost.flatMap{h =>
		EnvriResolver.infer(h) match{
			case None => complete(StatusCodes.BadRequest -> s"Unexpected host $h, cannot find corresponding ENVRI")
			case Some(envri) => provide(envri)
		}
	}

	def extractEnvriDirectiveSoft(using EnvriConfigs) = envriDirective(
		extractHost.flatMap{h =>
			EnvriResolver.infer(h) match{
				case None => reject
				case Some(envri) => provide(envri)
			}
		}
	)
}
