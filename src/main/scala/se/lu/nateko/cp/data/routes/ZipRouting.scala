package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.*
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Route
import akka.stream.scaladsl.StreamConverters
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.formats.zip
import se.lu.nateko.cp.data.services.upload.DownloadService
import se.lu.nateko.cp.data.utils.akka.gracefulForbid
import se.lu.nateko.cp.data.utils.akka.gracefulUnauth
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.StaticObject

import java.io.InputStream
import java.util.zip.ZipFile
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import DownloadRouting.{getClientIp, respondWithAttachment, getContentType}
import UploadRouting.Sha256Segment
import akka.stream.scaladsl.Source
import akka.util.ByteString
import java.time.Instant
import se.lu.nateko.cp.cpauth.core.DataObjDownloadInfo
import se.lu.nateko.cp.data.api.PortalLogClient
import se.lu.nateko.cp.meta.core.data.Envri


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
		val zipEntry = zipFile.getEntry(filePath)

		Try(zipFile.getInputStream(zipEntry))


	def fetchEntry(res: Try[StaticObject], filePath: String)(using Envri) = res match
		case Success(dobj) =>
			extractFile(dobj, filePath) match {
				case Success(in) => 
					val fileName = filePath.split("/").last

					respondWithAttachment(fileName){
						complete(HttpEntity(getContentType(fileName), StreamConverters.fromInputStream(() => in)))
					}
				case Failure(exception) => complete(StatusCodes.BadRequest -> "Empty zip entry")
			}
		case Failure(e) => complete(StatusCodes.NotFound -> e)

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
						complete(entries.map(_.getName).mkString("\n"))
					}
				} ~
				path("extractFile" / Remaining) { filePath =>
					onComplete(upload.meta.lookupPackage(hash)) { res =>
						ensureReferrerIsOwnApp{originInfo =>
							fetchEntry(res, filePath)
						} ~
						userOpt{
							case None =>
								gracefulUnauth(s"$envri data portal login is required for zip entry downloads")
							case Some(uid) =>
									onSuccess(downloadService.licencesToAccept(Seq(hash), Some(uid))){licUris =>
										if licUris.isEmpty
										then fetchEntry(res, filePath)
										else gracefulForbid(
											"Accepting the following licence(s) is required for download: " + licUris.mkString(", ")
										)
									}
						}
					}
				}
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
