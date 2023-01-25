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
import spray.json.JsArray
import spray.json.JsNumber
import spray.json.JsObject
import spray.json.JsString
import spray.json.JsValue
import spray.json.JsonWriter

import java.io.InputStream
import java.net.URLDecoder
import java.time.Instant
import java.util.zip.ZipEntry
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
)(using EnvriConfigs, ExecutionContext) extends SprayRouting:

	import authRouting.userOpt
	import downloadService.upload

	val extractEnvri = UploadRouting.extractEnvriDirective

	def extractFile(dobj: StaticObject, decodedPath: String): Try[InputStream] =
		val zipFile = ZipFile(upload.getFile(dobj).toPath.toString)
		val zipEntry = zipFile.getEntry(decodedPath)

		Try(zipFile.getInputStream(zipEntry))


	def fetchEntry(dobj: StaticObject, filePath: String, hashId: String, uid: Option[UserId], localOrigin: Option[String])(using Envri) =
		val decodedPath = URLDecoder.decode(filePath, "UTF-8")
		extractFile(dobj, decodedPath) match
			case Success(in) =>
				val fileName = filePath.split("/").last

				getClientIp{ip =>
					val dlInfo = ZipExtractionInfo(
						time = Instant.now(),
						ip = ip,
						hashId = hashId,
						zipEntryPath = decodedPath,
						cpUser = uid.map(authRouting.anonymizeCpUser),
						localOrigin = localOrigin
					)

					logClient.logDownload(dlInfo)

					respondWithAttachment(fileName){
						complete(HttpEntity(getContentType(fileName), StreamConverters.fromInputStream(() => in)))
					}
				}

			case Failure(exception) => complete(StatusCodes.NotFound -> "Unknown zip entry")


	val route = pathPrefix("zip") { extractEnvri{envri ?=>
		val ensureReferrerIsOwnApp = RoutingHelper.ensureReferrerIsOwnAppDir(authRouting.conf)

		get {
			pathPrefix(Sha256Segment){ implicit hash =>
				path("listContents"){
					val entriesFut = upload.meta.lookupObjFormat(hash).flatMap{ formatUri =>
						val file = upload.getFile(Some(formatUri), hash)
						Future.fromTry(zip.listEntries(file))
					}
					onSuccess(entriesFut){entries =>
						respondWithHeader(`Access-Control-Allow-Origin`.`*`){
							import ZipRouting.zipEntryWriter
							complete(entries)
						}
					}
				} ~
				path("extractFile" / Remaining) { filePath =>
					onComplete(upload.meta.lookupPackage(hash)) {
						case Failure(e) => complete(StatusCodes.NotFound -> e)
						case Success(dobj) => downloadService.inaccessibilityReason(dobj).fold{
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
						}{
							problem => complete(StatusCodes.NotFound -> problem)
						}
					}
				} ~
				complete(StatusCodes.NotFound -> "Only 'listContents' and 'extractFile' services are available for zipped objects")
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
end ZipRouting

object ZipRouting:
	given zipEntryWriter(using hash: Sha256Sum): JsonWriter[ZipEntry] with
		def write(ze: ZipEntry): JsValue = JsObject(
			"name" -> JsString(ze.getName),
			"path" -> JsString(s"/zip/${hash.base64Url}/extractFile/" + ze.getName),
			"size" -> JsNumber(ze.getSize)
		)
