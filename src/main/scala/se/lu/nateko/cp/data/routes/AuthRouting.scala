package se.lu.nateko.cp.data.routes

import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import akka.http.scaladsl.server.Directives._
import se.lu.nateko.cp.cpauth.core.Authenticator
import akka.http.scaladsl.server.Route
import se.lu.nateko.cp.cpauth.core.UserInfo
import akka.http.scaladsl.server.StandardRoute
import scala.util.Success
import scala.util.Failure
import se.lu.nateko.cp.cpauth.core.CookieToToken
import akka.http.scaladsl.model.StatusCodes

class AuthRouting(authConfig: PublicAuthConfig) {

	private[this] val authenticator = Authenticator(authConfig).get

	def user(inner: UserInfo => Route): Route = cookie(authConfig.authCookieName)(cookie => {
		val userTry = for(
			token <- CookieToToken.recoverToken(cookie.value);
			uinfo <- authenticator.unwrapUserInfo(token)
		) yield uinfo

		userTry match {
			case Success(uinfo) => inner(uinfo)
			case Failure(err) =>
				forbid(toMessage(err))
		}
	}) ~ forbid(s"Authentication cookie ${authConfig.authCookieName} was not set")

	private def forbid(msg: String): StandardRoute = complete((StatusCodes.Forbidden, msg))

	private def toMessage(err: Throwable): String = {
		val msg = err.getMessage
		if(msg == null || msg.isEmpty) err.getClass.getName else msg
	}
}