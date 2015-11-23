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
import se.lu.nateko.cp.data.services.FileStorageService
import scala.util.Try

class DataRoutes(authConfig: PublicAuthConfig, fileService: FileStorageService)(implicit mat: Materializer) {

	private implicit val ex = mat.executionContext
	private[this] val shaPattern = """[0-9a-fA-F]{64}""".r.pattern

	private def ensureSha256(sum: String): Try[String] = {
		if(shaPattern.matcher(sum).matches) Success(sum.toLowerCase)
		else Failure(new Exception("Invalid SHA-256 sum, expecting a 32-byte hexadecimal string"))
	}

	val upload: Route = (put & path("files" / Segment)){ fileName =>
		onSuccess(Future.fromTry(ensureSha256(fileName))){ hashsum =>
			user{ uinfo =>
				extractRequest{ req =>
					val nbytesFuture: Future[Long] = req.entity.dataBytes
						.runWith(fileService.getFileSavingSink(hashsum))
	
					onSuccess(nbytesFuture){nbytes =>
						val msg = if(nbytes == 0)
							"This file is already there, upload aborted"
						else s"Successfully uploaded $nbytes bytes"
						complete(s"\nHi, ${uinfo.givenName}! $msg\n")
					}
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
	}) ~ extractRequest{ req =>
		println(req.cookies.head.name == authConfig.authCookieName)
		forbid(s"Authentication cookie ${authConfig.authCookieName} was not set")
	}

	private def forbid(msg: String): StandardRoute = complete((StatusCodes.Forbidden, msg))

	private def toMessage(err: Throwable): String = {
		val msg = err.getMessage
		if(msg == null || msg.isEmpty) err.getClass.getName else msg
	}

}