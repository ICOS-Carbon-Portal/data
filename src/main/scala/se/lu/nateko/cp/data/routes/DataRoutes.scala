package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives._
import akka.stream.scaladsl.Sink
import akka.stream.Materializer
import scala.concurrent.Future
import se.lu.nateko.cp.cpauth.core.UserInfo
import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import se.lu.nateko.cp.cpauth.core.Authenticator
import se.lu.nateko.cp.cpauth.core.CookieToToken
import scala.util.Success
import scala.util.Failure
import akka.http.scaladsl.server.MissingCookieRejection
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.StandardRoute

class DataRoutes(authConfig: PublicAuthConfig)(implicit mat: Materializer) {

	val upload: Route = user{ uinfo =>
		put{
			extractRequest{ req =>
				val lengthFuture: Future[Long] = req.entity.dataBytes
					.map(_.size)
					.runWith(Sink.fold(0L){_ + _})

				onSuccess(lengthFuture){length =>
					complete(s"\nHi, ${uinfo.givenName}! You have uploaded $length bytes.\n")
				}
			}
		}
	}

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