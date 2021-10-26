package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.headers._
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.StandardRoute
import se.lu.nateko.cp.cpauth.core.CpbDownloadInfo
import se.lu.nateko.cp.cpauth.core.DownloadEventInfo
import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.CpdataJsonProtocol._
import se.lu.nateko.cp.data.api.PortalLogClient
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.services.fetch.BinTableRequest
import se.lu.nateko.cp.data.services.fetch.FromBinTableFetcher
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs

import java.time.Instant

class CpbFetchRouting(
	fetcher: FromBinTableFetcher,
	restHeart: RestHeartClient,
	logClient: PortalLogClient,
	authRouting: AuthRouting
)(implicit envriConf: EnvriConfigs) {
	import UploadRouting.requireShaHash
	import DownloadRouting.getClientIp
	import authRouting.userOpt

	val extractEnvri = UploadRouting.extractEnvriDirective

	val route = path("portal" / "tabular"){ //to be removed, for data licence compliance
		post{
			entity(as[BinTableRequest]){ tableRequest =>
				respondWithHeaders(`Access-Control-Allow-Origin`.*){
					returnBinary(tableRequest)
				}
			} ~
			complete((StatusCodes.BadRequest, s"Expected a proper binary table request"))
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
	(pathPrefix("cpb") & extractEnvri){implicit envri =>
		val controlOrigins = controlOriginsDir
		(post & respondWithHeader(`Access-Control-Allow-Credentials`(true))){
			userOpt{uidOpt =>
				controlOrigins{originInfo =>
					fetchCpbRoute(uidOpt, Some(originInfo))
				} ~
				uidOpt.fold[Route]{
					complete(StatusCodes.Unauthorized -> s"$envri data portal login is required for binary downloads")
				}{uid =>
					onSuccess(restHeart.getUserLicenseAcceptance(uid)){accepted =>
						if(accepted) fetchCpbRoute(uidOpt, None)
						else complete(StatusCodes.Forbidden -> "Accepting data licence in your user profile is required for binary downloads")
					}
				}
			}
		} ~
		options{
			controlOrigins{_ =>
				respondWithHeaders(
					`Access-Control-Allow-Methods`(HttpMethods.POST),
					`Access-Control-Allow-Credentials`(true),
					`Access-Control-Allow-Headers`("Content-Type")
				){
					complete(StatusCodes.OK)
				}
			} ~
			complete(StatusCodes.OK)
		}
	}

	private def controlOriginsDir(implicit envri: Envri): Directive1[String] = headerValueByType(Referer).tflatMap{
		case Tuple1(Referer(uri)) =>
			val hostStr = uri.authority.host.toString
			if(authRouting.conf.pub.get(envri).map(_.authCookieDomain).contains(hostStr.dropWhile(_ != '.'))){
				import Uri.Path.{Segment, Slash}
				val subDomain = hostStr.takeWhile(_ != '.')
				val originInfo = uri.path match{
					case Slash(Segment(pathseg, _)) => s"$subDomain/$pathseg"
					case _ => subDomain
				}
				val origin = HttpOrigin(uri.scheme, Host(uri.authority.host, uri.authority.port))
				respondWithHeader(`Access-Control-Allow-Origin`(origin)).tflatMap(_ => provide(originInfo))
			} else reject
		case _ => reject
	}

	private def fetchCpbRoute(uid: Option[UserId], localOrigin: Option[String])(implicit envri: Envri): Route =
		entity(as[BinTableRequest]){ tableRequest =>
			getClientIp{ip =>
				val dlInfo = CpbDownloadInfo(
					time = Instant.now(),
					ip = ip,
					hashId = tableRequest.tableId.id,
					cpUser = uid.map(authRouting.anonymizeCpUser),
					colNums = tableRequest.columnNumbers,
					slice = tableRequest.slice.map{bts =>
						DownloadEventInfo.CpbSlice(bts.offset, bts.length)
					},
					localOrigin = localOrigin
				)
				logClient.logDownload(dlInfo)
				returnBinary(tableRequest)
			}
		} ~
		complete((StatusCodes.BadRequest, s"Expected a proper binary table request"))

	private def returnBinary(req: BinTableRequest): StandardRoute = complete(
		HttpEntity(
			ContentTypes.`application/octet-stream`,
			fetcher.getResponseSize(req),
			fetcher.getSource(req)
		)
	)
}
