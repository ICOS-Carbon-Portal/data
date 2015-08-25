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
import akka.util.ByteString
import java.security.MessageDigest

class DataRoutes(authConfig: PublicAuthConfig)(implicit mat: Materializer) {

	private implicit val ex = mat.executionContext

	private def shaSink: Sink[ByteString, Future[String]] = {
		val md = MessageDigest.getInstance("SHA-256")

		def getDigest(in: Future[Unit]): Future[String] = in.map{_ =>
			md.digest.map("%02x" format _).mkString
		}

		Sink.foreach[ByteString]{bstr =>
			bstr.asByteBuffers.foreach(md.update)
		}.mapMaterializedValue(getDigest)
	}

	val upload: Route = user{ uinfo =>
		put{
			extractRequest{ req =>
				val shaFuture: Future[String] = req.entity.dataBytes
					.runWith(shaSink)

				onSuccess(shaFuture){sha =>
					complete(s"\nHi, ${uinfo.givenName}! You uploaded a file with SHA-256 hash $sha\n")
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