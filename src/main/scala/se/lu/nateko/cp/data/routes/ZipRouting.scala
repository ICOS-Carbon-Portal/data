package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.*
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Route
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.DataObjDownloadInfo
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.cpauth.core.ZipExtractionInfo
import se.lu.nateko.cp.data.api.PortalLogClient
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.formats.zip
import se.lu.nateko.cp.data.services.upload.DownloadService
import se.lu.nateko.cp.data.utils.akka.gracefulForbid
import se.lu.nateko.cp.data.utils.akka.gracefulUnauth
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.StaticObject
import spray.json.JsNumber
import spray.json.JsObject
import spray.json.JsString

import java.io.InputStream
import java.net.URLDecoder
import java.time.Instant
import java.util.zip.ZipFile
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import DownloadRouting.{getClientIp, respondWithAttachment, getContentType}
import UploadRouting.Sha256Segment


class ZipRouting(
	downloadService: DownloadService,
	restHeart: RestHeartClient,
	logClient: PortalLogClient,
	authRouting: AuthRouting
)(using EnvriConfigs, ExecutionContext) {

	import authRouting.userOpt
	import downloadService.upload

	val extractEnvri = UploadRouting.extractEnvriDirective

	def extractFile(dobj: StaticObject, filePath: String): Try[InputStream] =
		val zipFile = ZipFile(upload.getFile(dobj).toPath.toString)
		val decodedPath = URLDecoder.decode(filePath, "UTF-8")
		val zipEntry = zipFile.getEntry(decodedPath)

		Try(zipFile.getInputStream(zipEntry))


	def fetchEntry(dobj: StaticObject, filePath: String, hashId: String, uid: Option[UserId], localOrigin: Option[String])(using Envri) =
		extractFile(dobj, filePath) match
			case Success(in) =>
				val fileName = filePath.split("/").last

				getClientIp{ip =>
					val dlInfo = ZipExtractionInfo(
						time = Instant.now(),
						ip = ip,
						hashId = hashId,
						zipEntryPath = filePath,
						cpUser = uid.map(u => authRouting.anonymizeCpUser(u)),
						localOrigin = localOrigin
					)

					logClient.logDownload(dlInfo)

					respondWithAttachment(fileName){
						complete(HttpEntity(getContentType(fileName), StreamConverters.fromInputStream(() => in)))
					}
				}

			case Failure(exception) => complete(StatusCodes.BadRequest -> "Unknown zip entry")


	val route = pathPrefix("zip") { extractEnvri{envri ?=>
		val ensureReferrerIsOwnApp = RoutingHelper.ensureReferrerIsOwnAppDir(authRouting.conf)

		get {
			pathPrefix(Sha256Segment){ hash =>
				path("listContents"){
					val entriesFut = upload.meta.lookupObjFormat(hash).flatMap{ formatUri =>
						val file = upload.getFile(Some(formatUri), hash)
						Future.fromTry(zip.listEntries(file))
					}
					onSuccess(entriesFut){entries =>
						complete(entries.map(e => JsObject("name" -> JsString(e.getName.split("/").last),
														   "path" -> JsString(e.getName),
														   "size" -> JsNumber(e.getSize))).mkString("\n"))
					}
				} ~
				path("extractFile" / Remaining) { filePath =>
					onComplete(upload.meta.lookupPackage(hash)) {
						case Failure(e) => complete(StatusCodes.NotFound -> e)
						case Success(dobj) =>
							userOpt{uidOpt =>
								ensureReferrerIsOwnApp{originInfo =>
									fetchEntry(dobj, filePath, hash.id, uidOpt, Some(originInfo))
								} ~
								onSuccess(downloadService.licencesToAccept(Seq(hash), uidOpt)){licUris =>
									if licUris.isEmpty then
										fetchEntry(dobj, filePath, hash.id, uidOpt, None)

									else if uidOpt.isEmpty then
										gracefulUnauth(s"$envri data portal login is required for zip entry downloads")

									else gracefulForbid(
										"Accepting the following licence(s) is required for download: " + licUris.mkString(", ")
									)
								}
							}
					}
				} ~
				complete(StatusCodes.NotFound)
			} ~
			complete(StatusCodes.BadRequest -> "Expected base64Url- or hex-encoded SHA-256 hash")
		} ~
		options{
			ensureReferrerIsOwnApp{_ =>
				respondWithHeaders(
					`Access-Control-Allow-Methods`(HttpMethods.GET),
					`Access-Control-Allow-Credentials`(true),
					`Access-Control-Allow-Headers`("Content-Type")
				){
					complete(StatusCodes.OK)
				}
			} ~
			complete(StatusCodes.BadRequest -> s"You are not a ${envri} own Web app")
		}
	}}
}
