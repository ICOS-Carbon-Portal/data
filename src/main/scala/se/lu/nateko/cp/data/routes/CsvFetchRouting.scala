package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Route
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CsvDownloadInfo
import se.lu.nateko.cp.data.api.DownloadEventInfo
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.services.fetch.BinTableCsvReader
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.meta.core.data.EnvriConfigs

import java.time.Instant

import DownloadRouting.respondWithAttachment
import se.lu.nateko.cp.cpauth.core.UserId


class CsvFetchRouting(
	upload: UploadService,
	restHeart: RestHeartClient,
	authRouting: AuthRouting
)(implicit envriConf: EnvriConfigs) {
	import UploadRouting.requireShaHash
	import DownloadRouting.{getClientIp, getUserAgent}
	import authRouting.user
	private val fetcher = new BinTableCsvReader(upload)

	val extractEnvri = UploadRouting.extractEnvriDirective

	val route: Route = (pathPrefix("csv") & get) { extractEnvri { envri ?=>
		requireShaHash{hash =>
			user{uid =>
				onSuccess(restHeart.getUserLicenseAcceptance(uid)){accepted =>
					if(accepted) fetchCsvRoute(hash, uid)
					else complete(StatusCodes.Forbidden -> "Accepting data licence in your user profile is required for CSV downloads")
				}
			} ~
			complete(StatusCodes.Unauthorized -> s"$envri data portal login is required for CSV downloads")
		}
	}}

	private def fetchCsvRoute(hash: Sha256Sum, uid: UserId)(implicit envri: Envri): Route = getClientIp{ip =>
		parameters("col".repeated, "offset".as[Long].optional, "limit".as[Int].optional){(cols, offsetOpt, limitOpt) =>

			val onlyColumnsOpt = Option(cols.toArray.reverse).filterNot(_.isEmpty)

			onSuccess(fetcher.csvSource(hash, onlyColumnsOpt, offsetOpt, limitOpt)){case (src, fileName) =>
				val csvSelect = DownloadEventInfo.CsvSelect(onlyColumnsOpt.map(_.toIndexedSeq), offsetOpt, limitOpt)
				val anonUser = Some(authRouting.anonymizeCpUser(uid))
				getUserAgent{agentOpt =>
					val dlInfo = CsvDownloadInfo(Instant.now(), hash.id, anonUser, agentOpt, csvSelect)
					restHeart.logDownloadEvent(dlInfo, ip)
					respondWithAttachment(fileName){
						complete(
							HttpEntity(ContentTypes.`text/csv(UTF-8)`, src.map(s => ByteString(s)))
						)
					}
				}
			}
		}
	}
}
