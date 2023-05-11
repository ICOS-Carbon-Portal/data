package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.headers.*
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.StandardRoute
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.CpdataJsonProtocol.given
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.api.CpbDownloadInfo
import se.lu.nateko.cp.data.api.DownloadEventInfo
import se.lu.nateko.cp.data.utils.akka.{gracefulBadReq, gracefulUnauth, gracefulForbid}
import se.lu.nateko.cp.data.services.fetch.BinTableRequest
import se.lu.nateko.cp.data.services.fetch.FromBinTableFetcher
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.meta.core.data.EnvriConfigs

import java.time.Instant

class CpbFetchRouting(
	fetcher: FromBinTableFetcher,
	restHeart: RestHeartClient,
	authRouting: AuthRouting
)(using envriConf: EnvriConfigs) {

	import DownloadRouting.{getClientIp, getUserAgent}
	import authRouting.userOpt

	val extractEnvri = UploadRouting.extractEnvriDirective

	val route = path("portal" / "tabular"){ //to be removed, for data licence compliance
		post{
			entity(as[BinTableRequest]){ tableRequest =>
				respondWithHeaders(`Access-Control-Allow-Origin`.*){
					returnBinary(tableRequest)
				}
			} ~
			gracefulBadReq(s"Expected a proper binary table request")
		} ~
		options{
			respondWithHeaders(
				`Access-Control-Allow-Origin`.*,
				`Access-Control-Allow-Methods`(HttpMethods.POST),
				`Access-Control-Allow-Headers`("Content-Type")
			){
				complete(StatusCodes.OK)
			}
		}
	} ~ // end of the block to be removed
	pathPrefix("cpb") { extractEnvri{envri ?=>
		val ensureReferrerIsOwnApp = RoutingHelper.ensureReferrerIsOwnAppDir(authRouting.conf)
		(post & respondWithHeader(`Access-Control-Allow-Credentials`(true))){
			userOpt{uidOpt =>
				ensureReferrerIsOwnApp{originInfo =>
					fetchCpbRoute(uidOpt, Some(originInfo))
				} ~
				uidOpt.fold[Route]{
					gracefulUnauth(s"$envri data portal login is required for binary downloads")
				}{uid =>
					onSuccess(restHeart.getUserLicenseAcceptance(uid)){accepted =>
						if(accepted) fetchCpbRoute(uidOpt, None)
						else gracefulForbid("Accepting data licence in your user profile is required for binary downloads")
					}
				}
			}
		} ~
		options{
			ensureReferrerIsOwnApp{_ =>
				respondWithHeaders(
					`Access-Control-Allow-Methods`(HttpMethods.POST),
					`Access-Control-Allow-Credentials`(true),
					`Access-Control-Allow-Headers`("Content-Type")
				){
					complete(StatusCodes.OK)
				}
			} ~
			complete(StatusCodes.BadRequest -> s"You are not a ${envri} own Web app")
		}
	}}

	private def fetchCpbRoute(uid: Option[UserId], localOrigin: Option[String])(using Envri): Route =
		entity(as[BinTableRequest]){ tableRequest =>
			(getClientIp & getUserAgent){(ip, agentOpt) =>
				val dlInfo = CpbDownloadInfo(
					time = Instant.now(),
					hashId = tableRequest.tableId.id,
					cpUser = uid.map(authRouting.anonymizeCpUser),
					colNums = tableRequest.columnNumbers,
					slice = tableRequest.slice.map{bts =>
						DownloadEventInfo.CpbSlice(bts.offset, bts.length)
					},
					localOrigin = localOrigin,
					userAgent = agentOpt
				)
				restHeart.logDownloadEvent(dlInfo, ip)
				returnBinary(tableRequest)
			}
		} ~
		gracefulBadReq(s"Expected a proper binary table request")

	private def returnBinary(req: BinTableRequest): StandardRoute = complete(
		HttpEntity(
			ContentTypes.`application/octet-stream`,
			fetcher.getResponseSize(req),
			fetcher.getSource(req)
		)
	)
}
