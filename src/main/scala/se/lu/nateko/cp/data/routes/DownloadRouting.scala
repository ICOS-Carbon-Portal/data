package se.lu.nateko.cp.data.routes

import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success
import LicenceRouting.LicenceCookieName
import LicenceRouting.UriLicenceProfile
import LicenceRouting.parseLicenceCookie
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model._
import akka.http.scaladsl.model.headers._
import akka.http.scaladsl.server.Directive
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.directives.Credentials.Provided
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.ContentTypeResolver
import akka.stream.Materializer
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.api.PortalLogClient
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.api.Utils
import se.lu.nateko.cp.data.routes.LicenceRouting.FormLicenceProfile
import se.lu.nateko.cp.data.services.upload.DownloadService
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.crypto.JsonSupport._
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data._
import se.lu.nateko.cp.meta.core.data.Envri.Envri

class DownloadRouting(authRouting: AuthRouting, uploadService: UploadService,
	restHeart: RestHeartClient, logClient: PortalLogClient, coreConf: MetaCoreConfig
)(implicit mat: Materializer) {
	import DownloadRouting._
	import UploadRouting._
	import authRouting._

	private implicit val ex = mat.executionContext
	private implicit val envriConfs = coreConf.envriConfigs

	private val downloadService = new DownloadService(coreConf, uploadService)
	private val log = downloadService.log
	val extractEnvri = extractEnvriDirective

	private val objectDownload: Route = requireShaHash{ hashsum =>
		extractEnvri{implicit envri =>
			onSuccess(uploadService.meta.lookupPackage(hashsum)){
				case dobj: DataObject =>
					licenceCookieHashsums{dobjs =>
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
					redirect(new UriLicenceProfile(Seq(hashsum), None, false).licenceUri, StatusCodes.Found)
				case doc: DocObject =>
					docAccessRoute(doc)
			}
		}
	}

	private val collectionDownload: Route = requireShaHash{ hashsum =>
		extractEnvri{implicit envri =>
			onSuccess(uploadService.meta.lookupCollection(hashsum)){ coll =>
				val hashes = coll.members.collect{
					case PlainStaticObject(_, hash, _) => hash
				}
				batchDownload(hashes, coll.title, licenceCheck(hashsum), logCollDownload(coll)){
					redirect(new UriLicenceProfile(Seq(hashsum), None, true).licenceUri, StatusCodes.Found)
				}
			}
		}
	}

	private def licenceCheck(hash: Sha256Sum): Directive1[Boolean] = licenceCookieHashsums.map(_.contains(hash))

	private def batchDownload(hashes: Seq[Sha256Sum], fileName: String, licenceCheck: Directive1[Boolean], extraLog: ExtraBatchLog = noopBatchLog)(
		alternative: Route
	): Route = userOpt{uidOpt =>
		extractEnvri{implicit envri =>

			val ok: Route = getClientIp{ip =>
				respondWithAttachment(fileName + ".zip"){
					val src = downloadService.getZipSource(
						hashes,
						logDownload(_, ip, uidOpt)
					)
					extraLog(ip, uidOpt)
					completeWithSource(src, ContentType(MediaTypes.`application/zip`))
				}
			}

			licenceCheck{licenceOk =>
				if(licenceOk) ok else reject
			} ~
			onSome(uidOpt){uid =>
				onComplete(restHeart.getUserLicenseAcceptance(uid)){
					case Success(true) => ok
					case _ => reject
				}
			} ~
			alternative
		}
	}

	private val batchObjectDownload: Route = pathEnd {
		get{
			parameters(('ids.as[Seq[Sha256Sum]], 'fileName)){(hashes, fileName) =>
				val licenceCheck: Directive1[Boolean] = licenceCookieHashsums.map(
					dobjs => hashes.diff(dobjs).isEmpty
				)
				batchDownload(hashes, fileName, licenceCheck){
					redirect(new UriLicenceProfile(hashes, Some(fileName), false).licenceUri, StatusCodes.Found)
				}
			} ~
			complete(StatusCodes.BadRequest -> "Expected fileName URL parameter and js array of SHA256 hashsums in 'ids' URL parameter")
		} ~
		post{
			formFields(('fileName, 'ids.as[Seq[Sha256Sum]], 'licenceOk.as[Boolean] ? false)){(fileName, hashes, licenceOk) =>

				batchDownload(hashes, fileName, provide(licenceOk)){
					val licProfile = new FormLicenceProfile(hashes, fileName)
					LicenceRouting.dataLicenceRoute(licProfile, authRouting.userOpt, coreConf.handleProxies)
				}
			} ~
			complete(StatusCodes.BadRequest -> "Expected js array of SHA256 hashsums in request payload")
		}
	}

	private val authent: Authenticator[String] = {
		case creds @ Provided(user) =>
			uploadService.getDownloadReporterPassword(user).filter(creds.verify).map(_ => user)
		case _ => None
	}

	private val downloadLogging: Route = parameters(('ip.?, 'endUser.?)){(ipOpt, endUserOpt) =>
		withBestAvailableIp(ipOpt){ip =>
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

	val route =
		pathPrefix(objectPathPrefix.stripSuffix("/")){
			batchObjectDownload ~
			get{ objectDownload }
		} ~
		pathPrefix(collectionPathPrefix.stripSuffix("/")){
			get{ collectionDownload }
		} ~
		path("logExternalDownload"){
			post{ downloadLogging }
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

	private def docAccessRoute(doc: DocObject): Route = {
		val file = uploadService.getFile(doc)
		if (file.exists) respondWithAttachment(doc.fileName){
			getFromFile(file, getContentType(doc.fileName))
		} else
			complete(StatusCodes.NotFound -> "Contents of this document are not found on the server.")
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
				case Success(obj) => obj.asDataObject.foreach(logPublicDownloadInfo(_, ip, extraInfo))
				case Failure(err) => log.error(err, s"Failed looking up ${hash} on the meta service while logging external downloads")
			}
		}
	}

	private def logPublicDownloadInfo(dobj: DataObject, ip: String, extraInfo: Seq[(String, String)] = Nil)(implicit envri: Envri): Unit =
		logClient.logDownload(dobj, ip, extraInfo:_*).failed.foreach(
			log.error(_, s"Failed logging download of object ${dobj.hash} from $ip to RestHeart")
		)

	private def logCollDownload(coll: StaticCollection)(implicit envri: Envri): ExtraBatchLog = (ip, uidOpt) => {
		logClient.logDownload(coll, ip).failed.foreach(
			log.error(_, s"Failed logging download of collection ${coll.res} from $ip to RestHeart")
		)
		for(uid <- uidOpt){
			restHeart.saveDownload(coll, uid).failed.foreach(
				log.error(_, s"Failed saving download of collection ${coll.res} to ${uid.email}'s user profile")
			)
		}
	}
}

object DownloadRouting{

	type ExtraBatchLog = (String, Option[UserId]) => Unit
	val noopBatchLog: ExtraBatchLog = (_, _) => ()

	private val optionalFileName: Directive1[Option[String]] = Directive{nameToRoute =>
		pathEndOrSingleSlash{
			nameToRoute(Tuple1(None))
		} ~
		path(Segment.?){segmOpt =>
			nameToRoute(Tuple1(segmOpt))
		}
	}

	val licenceCookieHashsums: Directive1[Seq[Sha256Sum]] = cookie(LicenceCookieName).flatMap{licCookie =>
		parseLicenceCookie(licCookie.value) match{
			case Success(hashes) => provide(hashes)
			case _ => reject
		}
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

	def toGoodIpAddress(ip: String): Option[String] = {
		val trimmed = ip.trim
		if(trimmed.isEmpty) None else try{
			val addr = java.net.InetAddress.getByName(trimmed)
			if(addr.isMulticastAddress || addr.isSiteLocalAddress) None
			else Some(trimmed)
		} catch{
			case _: Throwable => None
		}
	}

	def onSome[T](opt: Option[T]): Directive1[T] = provide(opt).flatMap{
		case Some(v) => provide(v)
		case None => reject
	}

	def withBestAvailableIp(userProvidedIp: Option[String]): Directive1[String] =
		userProvidedIp.flatMap(toGoodIpAddress).fold(getClientIp)(provide)

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
