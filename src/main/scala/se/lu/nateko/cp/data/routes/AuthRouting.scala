package se.lu.nateko.cp.data.routes

import akka.http.javadsl.server.CustomRejection
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.HttpCookie
import akka.http.scaladsl.model.headers.SameSite
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Directive1
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.MissingCookieRejection
import akka.http.scaladsl.server.RejectionHandler
import akka.http.scaladsl.server.Route
import se.lu.nateko.cp.cpauth.core.*
import se.lu.nateko.cp.data.AuthConfig
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.EnvriConfigs
import spray.json.JsObject

import scala.util.Failure
import scala.util.Success
import scala.util.Try

class AuthRouting(val conf: AuthConfig)(using EnvriConfigs) {

	private val extractEnvri = UploadRouting.extractEnvriDirective

	private def authConfig(using envri: Envri) = conf.pub(envri)
	private def authenticator(using envri: Envri) = Authenticator(authConfig).get

	private val authCookieNames = conf.pub.values.map(_.authCookieName).toSet

	val userTry: Directive1[Try[UserId]] = UploadRouting.extractEnvriAkkaDirective.flatMap{envri =>
		given Envri = envri
		cookie(authConfig.authCookieName).map{cookie =>
			for(
				signedToken <- CookieToToken.recoverToken(cookie.value);
				token <- authenticator.unwrapToken(signedToken)
			) yield token.userId
		}.or(
			provide(Failure(new CpDataException(s"Missing cookie '${authConfig.authCookieName}'")))
		)
	}

	val user: Directive1[UserId] = userTry.flatMap{
		case Success(uid) => provide(uid)
		case Failure(err) =>
			reject(new CpauthAuthenticationFailedRejection("Could not decode the authentication cookie: " + toMessage(err)))
	}

	val userOpt: Directive1[Option[UserId]] = userTry.map(_.toOption).or(provide(None))

	private val forbidAuthenticationFailures: Directive0 = handleRejections(
		RejectionHandler.newBuilder()
			.handle{
				case cafr: CpauthAuthenticationFailedRejection =>
					complete((StatusCodes.Forbidden, cafr.msg))
			}
			.handle{
				case MissingCookieRejection(cookieName) if authCookieNames.contains(cookieName) =>
					complete((StatusCodes.Forbidden, "Carbon Portal authentication cookie was missing"))
			}
			.result()
	)

	val userRequired: Directive1[UserId] = forbidAuthenticationFailures & user

	val whoami: Route = (get & path("whoami")){
		user{uid => complete(getWhoAmIObj(Some(uid)))} ~
		complete(getWhoAmIObj(None))
	}

	private def getWhoAmIObj(uidOpt: Option[UserId]): JsObject = {
		import spray.json._
		val email = uidOpt.map(uid => JsString(uid.email)).getOrElse(JsNull)
		JsObject("email" -> email)
	}

	val logout: Route = (get & path("logout")){ extractEnvri{
		val cookie = HttpCookie(authConfig.authCookieName, "deleted")
			.withDomain(authConfig.authCookieDomain)
			.withSameSite(SameSite.Strict)
			.withMaxAge(1)
		setCookie(cookie){complete(StatusCodes.OK)}
	}}

	def anonymizeCpUser(uid: UserId): DownloadEventInfo.AnonId =
		DownloadEventInfo.anonymizeCpUser(uid, conf.userSecretSalt)

	private def toMessage(err: Throwable): String = {
		val msg = err.getMessage
		if(msg == null || msg.isEmpty) err.getClass.getName else msg
	}
}

class CpauthAuthenticationFailedRejection(val msg: String) extends CustomRejection
