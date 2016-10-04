package se.lu.nateko.cp.data.routes

import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import akka.http.scaladsl.server.Directives._
import se.lu.nateko.cp.cpauth.core.Authenticator
import akka.http.scaladsl.server.Route
import se.lu.nateko.cp.cpauth.core.UserId
import akka.http.scaladsl.server.StandardRoute
import scala.util.Success
import scala.util.Failure
import se.lu.nateko.cp.cpauth.core.CookieToToken
import akka.http.scaladsl.model.StatusCodes

class AuthRouting(authConfig: PublicAuthConfig) {

	private[this] val authenticator = Authenticator(authConfig).get

	def user(inner: UserId => Route): Route = cookie(authConfig.authCookieName)(cookie => {
		val tokenTry = for(
			signedToken <- CookieToToken.recoverToken(cookie.value);
			token <- authenticator.unwrapToken(signedToken)
		) yield token

		tokenTry match {
			case Success(token) => inner(token.userId)
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