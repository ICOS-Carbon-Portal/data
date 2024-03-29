package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.headers.Host
import akka.http.scaladsl.model.headers.HttpOrigin
import akka.http.scaladsl.model.headers.Referer
import akka.http.scaladsl.model.headers.*
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives.*
import se.lu.nateko.cp.data.AuthConfig
import se.lu.nateko.cp.meta.core.data.EnvriConfigs
import eu.icoscp.envri.Envri

object RoutingHelper {

	/**
	  * Produces a directive that will controll HTTP header Referrer to claim that the request comes from an
	  * "authorized" own (i.e. hosted on ENVRI's own domains) web app. Can be used to offer functionality that
	  * would otherwise require, for example, log in and license acceptance. Extracts a string containing the 3rd
	  * level subdomain and the first segment of the path of the Referrer URL. This string can be used to log service usage.
	  *
	  * @param authRouting
	  * @param envri
	  * @return The directive
	  */
	def allowReferrerOnCondition(cond: String => Boolean) =
		headerValueByType(Referer).tflatMap{
			case Tuple1(Referer(uri)) =>
				val hostStr = uri.authority.host.toString
				import Uri.Path.{Segment, Slash}
				val subDomain = hostStr.takeWhile(_ != '.')
				val originInfo = uri.path match{
					case Slash(Segment(pathseg, _)) => s"$subDomain/$pathseg"
					case _ => subDomain
				}
				val origin = HttpOrigin(uri.scheme, Host(uri.authority.host, uri.authority.port))

				if cond(hostStr) then
					respondWithHeader(`Access-Control-Allow-Origin`(origin)).tflatMap(_ => provide(originInfo))
				else reject
			case null => reject
		}

	def ensureReferrerIsOwnAppDir(authConf: AuthConfig)(using envri: Envri): Directive1[String] =
		allowReferrerOnCondition(hostStr =>  authConf.pub.get(envri).map(_.authCookieDomain).contains(hostStr.dropWhile(_ != '.')))

	def ensureReferrerIsDataHost(authConf: AuthConfig)(using envri: Envri, envriConfs: EnvriConfigs): Directive1[String] =
		allowReferrerOnCondition(hostStr => envriConfs.get(envri).exists(_.dataHost == hostStr))

}
