package se.lu.nateko.cp.data.routes

import scala.util.Failure
import scala.util.Success
import akka.http.javadsl.server.CustomRejection
import akka.http.scaladsl.model.StatusCodes
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
import spray.json.{JsNull, JsObject, JsString}
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs

import scala.util.Try
import se.lu.nateko.cp.meta.core.data.Envri.Envri

class AuthRouting(authConfigs: Map[Envri, PublicAuthConfig])(implicit configs: EnvriConfigs) {

	private val extractEnvri = UploadRouting.extractEnvriDirective

	private def authConfig(implicit envri: Envri) = authConfigs(envri)
	private def authenticator(implicit envri: Envri) = Authenticator(authConfig).get

	private val authCookieNames = authConfigs.values.map(_.authCookieName).toSet

	def userOpt(inner: Option[UserId] => Route): Route =
		user{uid => inner(Some(uid))} ~
		inner(None)

	val userTry: Directive1[Try[UserId]] = extractEnvri.flatMap{implicit envri =>
		cookie(authConfig.authCookieName).map{cookie =>
			for(
				signedToken <- CookieToToken.recoverToken(cookie.value);
				token <- authenticator.unwrapToken(signedToken)
			) yield token.userId
		}
	}

	val user: Directive1[UserId] = userTry.flatMap{
		case Success(uid) => provide(uid)
		case Failure(err) =>
			reject(new CpauthAuthenticationFailedRejection("Could not decode the authentication cookie: " + toMessage(err)))
	}

	//TODO Try getting rid of "def userOpt" above
	val userOpt: Directive1[Option[UserId]] = userTry.map(_.toOption).recover{rejections =>
		val hasCookieRejection = rejections.collectFirst{
			case MissingCookieRejection(cookieName) if authCookieNames.contains(cookieName) => true
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

	val logout: Route = (get & path("logout") & extractEnvri){implicit envri =>
		val cookie = HttpCookie(authConfig.authCookieName, "deleted")
			.withDomain(authConfig.authCookieDomain)
			.withSameSite(SameSite.Strict)
			.withMaxAge(1)
		setCookie(cookie){complete(StatusCodes.OK)}
	}

	private def toMessage(err: Throwable): String = {
		val msg = err.getMessage
		if(msg == null || msg.isEmpty) err.getClass.getName else msg
	}
}

class CpauthAuthenticationFailedRejection(val msg: String) extends CustomRejection
