package se.lu.nateko.cp.data.routes

import scala.util.Failure
import scala.util.Success
import akka.http.javadsl.server.CustomRejection
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directive
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directive1
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
import spray.json.{JsNull, JsObject, JsString}

import scala.util.Try

class AuthRouting(authConfig: PublicAuthConfig) {

	private[this] val authenticator = Authenticator(authConfig).get

	def userOpt(inner: Option[UserId] => Route): Route =
		user{uid => inner(Some(uid))} ~
		inner(None)

	val userTry: Directive1[Try[UserId]] = cookie(authConfig.authCookieName).map{cookie =>
		for(
			signedToken <- CookieToToken.recoverToken(cookie.value);
			token <- authenticator.unwrapToken(signedToken)
		) yield token.userId
	}

	val user: Directive1[UserId] = userTry.flatMap{
		case Success(uid) => provide(uid)
		case Failure(err) =>
			reject(new CpauthAuthenticationFailedRejection("Could not decode the authentication cookie: " + toMessage(err)))
	}

	val userOpt: Directive1[Option[UserId]] = userTry.map(_.toOption).recover{rejections =>
		val hasCookieRejection = rejections.collectFirst{
			case MissingCookieRejection(cookieName) if cookieName == authConfig.authCookieName => true
		}
		if(hasCookieRejection.isDefined) provide(None)
		else reject
	}

	private val forbidAuthenticationFailures: Directive0 = handleRejections(
		RejectionHandler.newBuilder()
			.handle{
				case cafr: CpauthAuthenticationFailedRejection =>
					complete((StatusCodes.Forbidden, cafr.msg))
			}
			.handle{
				case MissingCookieRejection(cookieName) if cookieName == authConfig.authCookieName =>
					complete((StatusCodes.Forbidden, "Carbon Portal authentication cookie was missing"))
			}
			.result()
	)

	val userRequired: Directive1[UserId] = forbidAuthenticationFailures & user

	val whoami: Route = (get & path("whoami")){
		UploadRouting.getClientIp{ip =>
			user{uid => complete(getWhoAmIObj(ip, Some(uid)))} ~
			complete(getWhoAmIObj(ip, None))
		}
	}

	private def getWhoAmIObj(ip: String, uidOpt: Option[UserId]): JsObject = {
		import spray.json._
		val email = uidOpt.map(uid => JsString(uid.email)).getOrElse(JsNull)
		JsObject("email" -> email, "ip" -> JsString(ip))
	}

	val logout: Route = (get & path("logout")){
		deleteCookie(authConfig.authCookieName, domain = authConfig.authCookieDomain, path = "/"){
			complete(StatusCodes.OK)
		}
	}

	private def toMessage(err: Throwable): String = {
		val msg = err.getMessage
		if(msg == null || msg.isEmpty) err.getClass.getName else msg
	}
}

class CpauthAuthenticationFailedRejection(val msg: String) extends CustomRejection
