package se.lu.nateko.cp.data.routes

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.{Failure, Success, Try}
import LicenceRouting.LicenceCookieName
import LicenceRouting.licenceUri
import LicenceRouting.parseLicenceCookie
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model._
import akka.http.scaladsl.model.headers._
import akka.http.scaladsl.server.Directive
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.directives.Credentials.Provided
import akka.http.scaladsl.server.ExceptionHandler
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.ContentTypeResolver
import akka.http.scaladsl.unmarshalling.Unmarshaller
import akka.stream.Materializer
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.api.PortalLogClient
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.api.UnauthorizedUpload
import se.lu.nateko.cp.data.api.UploadUserError
import se.lu.nateko.cp.data.api.Utils
import se.lu.nateko.cp.data.services.upload.DownloadService
import se.lu.nateko.cp.data.services.upload.UploadResult
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.crypto.JsonSupport._
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.JsonSupport.ingestionMetadataExtractFormat
import spray.json._

class UploadRouting(authRouting: AuthRouting, uploadService: UploadService,
	restHeart: RestHeartClient, logClient: PortalLogClient, coreConf: MetaCoreConfig
)(implicit mat: Materializer) {
	import UploadRouting._
	import authRouting._

	private implicit val ex = mat.executionContext
	private implicit val envriConfs = coreConf.envriConfigs
	private implicit val uriFSU = Unmarshaller[String, Uri](_ => s => Future.fromTry(Try(Uri(s))))

	private val log = uploadService.log
	private val downloadService = new DownloadService(coreConf, uploadService, log)
	val extractEnvri = extractEnvriDirective

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
			parameters(('specUri.as[Uri], 'nRows.as[Int].?)){(specUri, nRowsOpt) =>
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
		extractEnvri{implicit envri =>
			addAccessControlHeaders(envri){
				respondWithHeaders(
					`Access-Control-Allow-Methods`(HttpMethods.PUT),
					`Access-Control-Allow-Headers`(`Content-Type`.name)
				){
					complete(StatusCodes.OK)
				}
			}
		}

	private val download: Route = requireShaHash{ hashsum =>
		extractEnvri{implicit envri =>
			onSuccess(uploadService.lookupPackage(hashsum)){dobj =>
				licenceCookieDobjList{dobjs =>
					deleteCookie(LicenceCookieName){
						if(dobjs.contains(hashsum)) (accessRoute(dobj))
						else reject
					}
				} ~
				user{uid =>
					onComplete(restHeart.getUserLicenseAcceptance(uid)){
						case Success(true) => accessRoute(dobj)
						case _ => reject
					}
				} ~
				redirect(licenceUri(Seq(hashsum), None), StatusCodes.Found)
			}
		}
	}

	private val batchDownload: Route = pathEnd{
		parameter(('ids.as[Seq[Sha256Sum]], 'fileName)){ (hashes, fileName) =>
			userOpt{uidOpt =>
				extractEnvri{implicit envri =>

					val ok = getClientIp{ip =>
						respondWithAttachment(fileName + ".zip"){
							val src = downloadService.getZipSource(
								hashes,
								logDownload(_, ip, uidOpt)
							)
							completeWithSource(src, ContentType(MediaTypes.`application/zip`))
						}
					}

					licenceCookieDobjList{dobjs =>
						if(hashes.diff(dobjs).isEmpty) ok else reject
					} ~
					onSome(uidOpt){uid =>
						onComplete(restHeart.getUserLicenseAcceptance(uid)){
							case Success(true) => ok
							case _ => reject
						}
					}
				}
			} ~
			redirect(licenceUri(hashes, Some(fileName)), StatusCodes.Found)
		} ~
		complete((StatusCodes.BadRequest, "Expected js array of SHA256 hashsums in 'ids' URL param and a 'fileName' param"))
	}

	private val authent: Authenticator[String] = {
		case creds @ Provided(user) =>
			uploadService.getDownloadReporterPassword(user).filter(creds.verify).map(_ => user)
		case _ => None
	}

	private val downloadLogging: Route = parameters(('ip.?, 'endUser.?)){(ipOpt, endUserOpt) =>

		val nonEmptyIpOpt = ipOpt.flatMap(ip => if(ip.trim.isEmpty) None else Some(ip.trim))

		val withBestAvailableIp: Directive1[String] = nonEmptyIpOpt.fold(getClientIp)(provide)

		withBestAvailableIp{ip =>
			ensureValidIpAddress(ip){
				extractHashsums{hashes =>
					extractEnvri{implicit envri =>
						authenticateBasic("Carbon Portal download reporting", authent){thirdParty =>
							logExternalDownloads(hashes, ip, thirdParty, endUserOpt)
							complete(s"Logging download (by $ip) of the following data objects:\n${hashes.mkString("\n")}")
						} ~
						complete(StatusCodes.Unauthorized)
					}
				}
			}
		}
	}

	val route = handleExceptions(errHandler){
		pathPrefix("objects"){
			put{ upload } ~
			post{ reIngest } ~
			options{ uploadHttpOptions } ~
			get{ batchDownload ~ download}
		} ~
		path("tryingest"){
			put{ tryIngest } ~
			options { uploadHttpOptions }
		} ~
		path("logExternalDownload"){
			post{ downloadLogging }
		}
	}

	private def accessRoute(dobj: DataObject)(implicit envri: Envri): Route = optionalFileName{_ => //legacy, can be removed later
		getClientIp{ip =>
				userOpt{uidOpt =>

					val fileName = dobj.fileName
					val contentType = getContentType(fileName)
					val file = uploadService.getFile(dobj)

					if(file.exists || uploadService.remoteStorageSourceExists(dobj)){
						logDownload(dobj, ip, uidOpt)
						respondWithAttachment(fileName){
							if(file.exists) getFromFile(file, contentType)
							else {
								val src = uploadService.getRemoteStorageSource(dobj)
								completeWithSource(src, contentType)
							}
						}
					}
					else complete(StatusCodes.NotFound -> "Contents of this data object are not found on the server.")
				}
		}
	}

	private def logDownload(dobj: DataObject, ip: String, uidOpt: Option[UserId])(implicit envri: Envri): Unit = {
		logPublicDownloadInfo(dobj, ip)
		for(uid <- uidOpt){
			restHeart.saveDownload(dobj, uid).failed.foreach(
				log.error(_, s"Failed saving download of ${dobj.hash} to ${uid.email}'s user profile")
			)
		}
	}

	private def logExternalDownloads(hashes: Seq[Sha256Sum], ip: String, thirdParty: String, endUser: Option[String])(implicit envri: Envri): Unit = {
		val extraInfo = ("distributor" -> thirdParty) :: endUser.filterNot(_.trim.isEmpty).map{"endUser" -> _}.toList

		Utils.runSequentially(hashes){hash =>
			uploadService.meta.lookupPackage(hash).andThen{
				case Success(dobj) => logPublicDownloadInfo(dobj, ip, extraInfo)
				case Failure(err) => log.error(err, s"Failed looking up ${hash} on the meta service while logging external downloads")
			}
		}
	}

	private def logPublicDownloadInfo(dobj: DataObject, ip: String, extraInfo: Seq[(String, String)] = Nil)(implicit envri: Envri): Unit =
		logClient.logDownload(dobj, ip, extraInfo:_*).failed.foreach(
			log.error(_, s"Failed logging download of ${dobj.hash} from $ip to RestHeart")
		)

	private def addAccessControlHeaders(implicit envri: Envri): Directive0 = optionalHeaderValueByType[Origin](()).flatMap{
		case Some(origin) if envriConfs(envri).metaPrefix.toString.startsWith(origin.value) =>
			respondWithHeaders( //allowing uploads from meta-hosted browser web apps
				`Access-Control-Allow-Origin`(origin.value), `Access-Control-Allow-Credentials`(true)
			)
		case _ => pass
	}
}

object UploadRouting{

	val Sha256Segment = Segment.flatMap(Sha256Sum.fromString(_).toOption)

	val requireShaHash: Directive1[Sha256Sum] = path(Sha256Segment.?).flatMap{
		case Some(hash) => provide(hash)
		case None => complete(StatusCodes.BadRequest -> s"Expected base64Url- or hex-encoded SHA-256 hash")
	}

	private val optionalFileName: Directive1[Option[String]] = Directive{nameToRoute =>
		pathEndOrSingleSlash{
			nameToRoute(Tuple1(None))
		} ~
		path(Segment.?){segmOpt =>
			nameToRoute(Tuple1(segmOpt))
		}
	}

	val licenceCookieDobjList: Directive1[Seq[Sha256Sum]] = Directive{dobjsToRoute =>
		cookie(LicenceCookieName){licCookie =>
			onComplete(parseLicenceCookie(licCookie.value)){
				case Success(dobjs) => dobjsToRoute(Tuple1(dobjs))
				case _ => reject
			}
		}
	}

	def onSome[T](opt: Option[T]): Directive1[T] = provide(opt).flatMap{
		case Some(v) => provide(v)
		case None => reject
	}

	private val errHandler = ExceptionHandler{
		//TODO Handle the case of data object metadata not found, and the case of metadata service being down
		case authErr: UnauthorizedUpload =>
			complete((StatusCodes.Unauthorized, authErr.getMessage))
		case userErr: UploadUserError =>
			complete((StatusCodes.BadRequest, userErr.getMessage))
		case err => throw err
	}

	def getContentType(fileName: String): ContentType = implicitly[ContentTypeResolver].apply(fileName)

	def respondWithAttachment(fileName: String): Directive0 = respondWithHeader(
		`Content-Disposition`(ContentDispositionTypes.attachment, Map("filename" -> fileName))
	)

	def completeWithSource(src: Source[ByteString, Any], contentType: ContentType): Route =
		complete(HttpResponse(entity = HttpEntity.CloseDelimited(contentType, src)))

	val getClientIp: Directive1[String] = optionalHeaderValueByType[`X-Forwarded-For`](()).flatMap{
		case Some(xff) => provide(xff.value)
		case None => complete(
			StatusCodes.BadRequest -> "Missing 'X-Forwarded-For' header, bad reverse proxy configuration on the server"
		)
	}

	def extractEnvriDirective(implicit configs: EnvriConfigs): Directive1[Envri] = extractHost.flatMap{h =>
		Envri.infer(h) match{
			case None => complete(StatusCodes.BadRequest -> s"Unexpected host $h, cannot find corresponding ENVRI")
			case Some(envri) => provide(envri)
		}
	}

	def ensureValidIpAddress(ip: String): Directive0 =
		try{
			java.net.InetAddress.getByName(ip)
			pass
		} catch{
			case _: Throwable =>
				complete(StatusCodes.BadRequest -> s"Bad IP address $ip")
		}

	private val extractHashsums: Directive1[Seq[Sha256Sum]] = extractStrictEntity(1.second).flatMap{entity =>
		try{
			provide{
				entity.data.utf8String.split("\n").map{pid =>
					Sha256Sum.fromBase64Url(pid.split('/').last.trim).get
				}
			}
		} catch{
			case err: Throwable => complete(
				StatusCodes.BadRequest -> ("Expected newline-separated list of data object PIDs. Parsing error: " + err.getMessage)
			)
		}
	}
}
