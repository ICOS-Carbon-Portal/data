package se.lu.nateko.cp.data.routes

import akka.Done
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.model.*
import akka.http.scaladsl.model.headers.*
import akka.http.scaladsl.server.Directive
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.ContentTypeResolver
import akka.http.scaladsl.server.directives.Credentials.Provided
import akka.http.scaladsl.server.util.Tuple.forTuple1
import akka.http.scaladsl.server.util.{Tuple => AkkaTuple}
import akka.stream.Materializer
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.api.Utils
import se.lu.nateko.cp.data.routes.LicenceRouting.FormLicenceProfile
import se.lu.nateko.cp.data.services.dlstats.PostgisDlAnalyzer
import se.lu.nateko.cp.data.services.upload.DownloadService
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.data.streams.PrefetchedSource
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.crypto.JsonSupport.given
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.meta.core.data.*
import spray.json.*
import se.lu.nateko.cp.data.api.*

import java.net.URI
import java.time.Instant
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success

import LicenceRouting.LicenceCookieName
import LicenceRouting.UriLicenceProfile
import LicenceRouting.parseLicenceCookie
import se.lu.nateko.cp.data.api.MetadataObjectNotFound
import se.lu.nateko.cp.data.Main.metaClient

class DownloadRouting(
	authRouting: AuthRouting, downloadService: DownloadService,
	logClient: PostgisDlLogger, pgClient: PostgisEventWriter, coreConf: MetaCoreConfig
)(using mat: Materializer) {

	import DownloadRouting.*
	import UploadRouting.*
	import DefaultJsonProtocol.*
	import authRouting.userOpt

	private given ExecutionContextExecutor = mat.executionContext
	private given envriConfs: Map[Envri,EnvriConfig] = coreConf.envriConfigs

	private val log = downloadService.log
	val extractEnvri = extractEnvriDirective
	private def uploadService = downloadService.upload

	private val objectDownload: Route = requireShaHash{ hashsum =>
		extractEnvri{
			userOpt{uidOpt =>
				onComplete(uploadService.meta.lookupObject(hashsum)){
					case Success(dobj: DataObject) =>
						licenceCookieHashsums{ hashes =>
							deleteCookie(LicenceCookieName){
								if(hashes.contains(dobj.hash)) singleObjRoute(dobj, uidOpt)
								else reject
							}
						} ~
						onSuccess(downloadService.licenceToAccept(dobj, uidOpt)){
							case None =>
								singleObjRoute(dobj, uidOpt)
							case Some(licUri) =>
								redirect(new UriLicenceProfile(Seq(hashsum), None, false).licenceUri, StatusCodes.Found)
						}

					case Success(doc: DocObject) =>
						docAccessRoute(doc, uidOpt)
					case Failure(err) =>
						complete(StatusCodes.NotFound -> err.getMessage())
				}
			}
		}
	}

	private def singleObjRoute(dobj: DataObject, uid: Option[UserId])(using Envri): Route = getClientIp{ip =>
		downloadService.inaccessibilityReason(dobj).fold{
			val contentType = getContentType(dobj.fileName)
			logDownload(dobj, ip, uid)
			respondWithAttachment(dobj.fileName){
				getFromFile(uploadService.getFile(dobj, true), contentType)
			}
		}{
			problem => complete(StatusCodes.NotFound -> problem)
		}
	}

	private val collectionDownload: Route = requireShaHash{ hashsum =>
		extractEnvri{
			onSuccess(metaClient.lookupCollection(hashsum)){ (coll, members) =>
				val hashes = members.collect:
					case pso: PlainStaticObject => pso.hash

				val licenceCheck = batchLicenceCheck(hashes, _.contains(hashsum)){licUris =>
					//TODO Make the licence-accept redirect convey the list of licences
					redirect(new UriLicenceProfile(Seq(hashsum), None, true).licenceUri, StatusCodes.Found)
				}

				licenceCheck{
					batchDownload(hashes, coll.title, logCollDownload(coll))
				}
			}
		}
	}

	private def batchLicenceCheck(
		members: Seq[Sha256Sum],
		extraOkCond: Seq[Sha256Sum] => Boolean
	)(redirectFactory: Seq[URI] => Route)(using Envri): Directive0 = Directive.apply[Unit]{inner =>

		if(extraOkCond(Nil)) inner(())
		else licenceCookieHashsums{ hashes =>
			deleteCookie(LicenceCookieName){
				if(members.diff(hashes).isEmpty || extraOkCond(hashes)) inner(())
				else reject
			}
		} ~
		userOpt{uidOpt =>
			onSuccess(downloadService.licencesToAccept(members, uidOpt)){licUris =>
				if(licUris.isEmpty)
					inner(())
				else
					redirectFactory(licUris)
			}
		}
	}

	private def batchDownload(
		hashes: Seq[Sha256Sum], fileName: String, extraLog: ExtraBatchLog = noopBatchLog
	)(using Envri): Route = userOpt{uidOpt =>

		getClientIp{ip =>
			respondWithAttachment(fileName + ".zip"){
				val src = downloadService.getZipSource(
					hashes,
					logDownload(_, ip, uidOpt)
				)
				extraLog(ip, uidOpt)
				completeWithSource(src, ContentType(MediaTypes.`application/zip`))
			}
		}
	}

	private val batchObjectDownload: Route = pathEnd { extractEnvri{
		get{
			parameters("ids".as[IndexedSeq[Sha256Sum]], "fileName"){(hashes, fileName) =>

				val licenceCheck = batchLicenceCheck(hashes, _ => false){
					//TODO Make the licence-accept redirect convey the list of licences
					licUris => redirect(
						new UriLicenceProfile(hashes, Some(fileName), false).licenceUri,
						StatusCodes.Found
					)
				}

				licenceCheck{
					batchDownload(hashes, fileName)
				}
			} ~
			complete(StatusCodes.BadRequest -> "Expected fileName URL parameter and js array of SHA256 hashsums in 'ids' URL parameter")
		} ~
		post{
			formFields("fileName", "ids".as[IndexedSeq[Sha256Sum]], "licenceOk".as[Boolean] ? false){(fileName, hashes, licenceOk) =>

				batchLicenceCheck(hashes, _ => licenceOk){licUris =>
					//TODO Make the licence-accept page support the list of licences
					val licProfile = new FormLicenceProfile(hashes.toIndexedSeq, fileName)
					LicenceRouting.dataLicenceRoute(licProfile, authRouting.userOpt, coreConf.handleProxies)
				}{
					batchDownload(hashes.toIndexedSeq, fileName)
				}
			} ~
			complete(StatusCodes.BadRequest -> "Expected fileName and ids (js array of SHA256 hashsums) in request payload")
		}
	}}

	private val authent: Authenticator[String] = {
		case creds @ Provided(user) =>
			uploadService.getDownloadReporterPassword(user).filter(creds.verify).map(_ => user)
		case _ => None
	}

	private val downloadLogging: Route = parameters("ip".?, "endUser".?){(ipOpt, endUserOpt) =>
		withBestAvailableIp(ipOpt){ip =>
			extractHashsums{hashes =>
				extractEnvri{
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

	private def docAccessRoute(doc: DocObject, uidOpt: Option[UserId])(using Envri): Route = {
		val file = uploadService.getFile(doc, true)
		if (file.exists) respondWithAttachment(doc.fileName){
			getClientIp{ip =>
				val dlInfo = DocumentDownloadInfo(
					time = Instant.now(),
					hashId = doc.hash.id,
					cpUser = uidOpt.map(authRouting.anonymizeCpUser),
				)
				for(uid <- uidOpt){
					downloadService.restHeart.saveDownload(doc, uid).failed.foreach(
						log.error(_, s"Failed saving download of document ${doc.accessUrl} to ${uid.email}'s user profile")
					)
				}
				logClient.logDl(dlInfo, ip)
				getFromFile(file, getContentType(doc.fileName))
			}
		} else
			complete(StatusCodes.NotFound -> "Contents of this document are not found on the server.")
	}

	private def logDownload(dobj: DataObject, ip: String, uidOpt: Option[UserId])(using Envri): Unit = {
		logPublicDownloadInfo(dobj, ip, uidOpt)

		for(uid <- uidOpt){
			downloadService.restHeart.saveDownload(dobj, uid).failed.foreach(
				log.error(_, s"Failed saving download of ${dobj.hash} to ${uid.email}'s user profile")
			)
		}
	}

	private def logExternalDownloads(
		hashes: Seq[Sha256Sum], ip: String, thirdParty: String, endUser: Option[String]
	)(using Envri): Unit = {
		("distributor" -> thirdParty) :: endUser.filterNot(_.trim.isEmpty).map{"endUser" -> _}.toList

		Utils.runSequentially(hashes.distinct){hash =>
			uploadService.meta.lookupObject(hash).transformWith{
				case Success(dobj: DataObject) =>
					logPublicDownloadInfo(dobj, ip, None, Some(thirdParty), endUser)
					done
				case Failure(err) =>
					log.error(err, s"Failed looking up ${hash} on the meta service while logging external downloads")
					done
				case _ => done
			}
		}
	}

	private def logPublicDownloadInfo(
		dobj: DataObject, ip: String, uid: Option[UserId], thirdParty: Option[String] = None, endUser: Option[String] = None
	)(using Envri): Unit =
		val dlInfo = DataObjDownloadInfo(
			time = Instant.now(),
			dobj = dobj,
			cpUser = uid.map(authRouting.anonymizeCpUser),
			endUser = endUser,
			distributor = thirdParty
		)

		logClient.logDl(dlInfo, ip)


	private def logCollDownload(coll: PlainStaticCollection)(using Envri): ExtraBatchLog = (ip, uidOpt) => {
		val dlInfo = CollectionDownloadInfo(
			time = Instant.now(),
			hashId = coll.res.getPath.split("/").last,
			cpUser = uidOpt.map(authRouting.anonymizeCpUser),
		)
		logClient.logDl(dlInfo, ip)
		for(uid <- uidOpt){
			downloadService.restHeart.saveDownload(coll, uid).failed.foreach(
				log.error(_, s"Failed saving download of collection ${coll.res} to ${uid.email}'s user profile")
			)
		}
	}
}

object DownloadRouting{

	type ExtraBatchLog = (String, Option[UserId]) => Unit
	val noopBatchLog: ExtraBatchLog = (_, _) => ()

	val licenceCookieHashsums: Directive1[Seq[Sha256Sum]] = cookie(LicenceCookieName).flatMap{licCookie =>
		parseLicenceCookie(licCookie.value) match{
			case Success(hashes) => provide(hashes)
			case _ => reject
		}
	}

	def getContentType(fileName: String): ContentType = summon[ContentTypeResolver].apply(fileName)

	def respondWithAttachment(fileName: String): Directive0 = respondWithHeader(
		`Content-Disposition`(ContentDispositionTypes.attachment, Map("filename" -> fileName))
	)

	def completeWithSource(src: Source[ByteString, Any], contentType: ContentType)(using mat: Materializer): Route =
		val prefetchedSrc = PrefetchedSource.prefetchSource(src, 1000000)(_.length)

		onComplete(prefetchedSrc){
			case Success(s) => complete(HttpResponse(entity = HttpEntity.CloseDelimited(contentType, s)))
			case Failure(exc) =>
				mat.system.log.error("Data download problem", exc)

				val httpCode = exc match
					case _: MetadataObjectNotFound => StatusCodes.NotFound
					case _ => StatusCodes.InternalServerError
				complete(httpCode -> exc.getMessage)
		}

	val getClientIp: Directive1[String] = optionalHeaderValueByType(`X-Forwarded-For`).flatMap{
		case Some(xff) => provide(xff.value)
		case None => complete(
			StatusCodes.BadRequest -> "Missing 'X-Forwarded-For' header, bad reverse proxy configuration on the server"
		)
	}

	val getUserAgent: Directive1[Option[String]] = optionalHeaderValueByType(`User-Agent`).map(_.map(_.value))

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
				}.toIndexedSeq
			}
		} catch{
			case err: Throwable => complete(
				StatusCodes.BadRequest -> ("Expected newline-separated list of data object PIDs. Parsing error: " + err.getMessage)
			)
		}
	}
}
