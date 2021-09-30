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

class CpbFetchRouting(
	fetcher: FromBinTableFetcher,
	restHeart: RestHeartClient,
	logClient: PortalLogClient,
	user: Directive1[UserId],
	authConf: Map[Envri, PublicAuthConfig]
)(implicit envriConf: EnvriConfigs) {
	import UploadRouting.requireShaHash
	import DownloadRouting.getClientIp

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
		post{
			controlOrigins{
				fetchCpbRoute
			} ~
			user{uid =>
				onSuccess(restHeart.getUserLicenseAcceptance(uid)){accepted =>
					if(accepted) fetchCpbRoute
					else complete(StatusCodes.Forbidden -> "Accepting data licence in your user profile is required for binary downloads")
				}
			} ~
			complete(StatusCodes.Unauthorized -> s"$envri data portal login is required for binary downloads")
		} ~
		options{
			controlOrigins{
				respondWithHeaders(
					`Access-Control-Allow-Methods`(HttpMethods.POST),
					`Access-Control-Allow-Headers`("Content-Type")
				){
					complete(StatusCodes.OK)
				}
			} ~
			complete(StatusCodes.OK)
		}
	}

	private def controlOriginsDir(implicit envri: Envri): Directive0 = headerValueByType(Origin).tflatMap{
		case Tuple1(Origin(Seq(o @ HttpOrigin(_, Host(Uri.NamedHost(host), _))))) =>
			if(authConf.get(envri).map(_.authCookieDomain).contains(host.dropWhile(_ != '.')))
				respondWithHeader(`Access-Control-Allow-Origin`(o))
			else reject
		case _ => reject
	}

	private def fetchCpbRoute(implicit envri: Envri): Route =
		entity(as[BinTableRequest]){ tableRequest =>
			getClientIp{ip =>
				val result = returnBinary(tableRequest)
				//TODO Log usage
				result
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
