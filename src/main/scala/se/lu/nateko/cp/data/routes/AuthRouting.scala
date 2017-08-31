package se.lu.nateko.cp.data.routes

import scala.util.Failure
import scala.util.Success

import akka.http.javadsl.server.CustomRejection
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.MissingCookieRejection
import akka.http.scaladsl.server.RejectionHandler
import akka.http.scaladsl.server.Route
import se.lu.nateko.cp.cpauth.core.Authenticator
import se.lu.nateko.cp.cpauth.core.CookieToToken
import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import se.lu.nateko.cp.cpauth.core.UserId
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import se.lu.nateko.cp.data.CpdataJsonProtocol.userIdFormat

class AuthRouting(authConfig: PublicAuthConfig) {

	private[this] val authenticator = Authenticator(authConfig).get

	def userOpt(inner: Option[UserId] => Route): Route =
		user{uid => inner(Some(uid))} ~
		inner(None)

	def user(inner: UserId => Route): Route = cookie(authConfig.authCookieName){cookie =>
		val tokenTry = for(
			signedToken <- CookieToToken.recoverToken(cookie.value);
			token <- authenticator.unwrapToken(signedToken)
		) yield token

		tokenTry match {
			case Success(token) =>
				inner(token.userId)
			case Failure(err) =>
				reject(new CpauthAuthenticationFailedRejection("Could not decode the authentication cookie: " + toMessage(err)))
		}
	}

	val forbidAuthenticationFailures: Directive0 = handleRejections(
		RejectionHandler.newBuilder()
			.handle{
				case cafr: CpauthAuthenticationFailedRejection =>
					complete((StatusCodes.Forbidden, cafr.msg))
			}
			.handle{
				case MissingCookieRejection(cookieName) if(cookieName == authConfig.authCookieName) =>
					complete((StatusCodes.Forbidden, "Carbon Portal authentication cookie was missing"))
			}
			.result()
	)

	val whoami: Route = (get & forbidAuthenticationFailures & path("whoami")){
		user{ uid => complete(uid)}
	}

	private def toMessage(err: Throwable): String = {
		val msg = err.getMessage
		if(msg == null || msg.isEmpty) err.getClass.getName else msg
	}
}

class CpauthAuthenticationFailedRejection(val msg: String) extends CustomRejection
