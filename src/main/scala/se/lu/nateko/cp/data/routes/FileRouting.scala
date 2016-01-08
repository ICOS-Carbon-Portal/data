package se.lu.nateko.cp.data.routes

import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success
import scala.util.Try
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import akka.stream.Materializer
import se.lu.nateko.cp.data.services.FileStorageService
import akka.http.scaladsl.server.directives.ContentTypeResolver
import akka.http.scaladsl.model.ContentTypes
import se.lu.nateko.cp.data.api.Sha256Sum
import akka.http.scaladsl.server.ValidationRejection
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.Connection

class FileRouting(authRouting: AuthRouting, fileService: FileStorageService)(implicit mat: Materializer) {

	private implicit val ex = mat.executionContext

	private def ensureSha256(inner: Sha256Sum => Route): String => Route =
		hash => Sha256Sum.fromBase64Url(hash).orElse(Sha256Sum.fromHex(hash)) match{
			case Success(hash) => inner(hash)
			case Failure(ex) => complete((StatusCodes.BadRequest, s"Expected base64Url- or hex-encoded SHA-256 hash, got $hash"))
		}

	private val upload: Route = path(Segment){
		ensureSha256{ hashsum =>
			authRouting.user{ uinfo =>
				extractRequest{ req =>
					val nbytesFuture: Future[Long] = req.entity.dataBytes
						.runWith(fileService.getFileSavingSink(hashsum))

					onSuccess(nbytesFuture){nbytes =>
						if(nbytes == 0)
							respondWithHeader(Connection("close")){
								complete((StatusCodes.Conflict, "This file is already there, upload aborted\n"))
							}
						else
							complete(s"\nHi, ${uinfo.givenName}! Successfully uploaded $nbytes bytes\n")
					}
				}
			}
		}
	}

	private val download: Route = pathPrefix(Segment){
		ensureSha256{ hashsum =>
			val file = fileService.getFile(hashsum)

			pathEnd{
				getFromFile(file, ContentTypes.`application/octet-stream`)
			} ~
			path(Segment)(fileName => {
				val contentResolver = implicitly[ContentTypeResolver]
				val contentType = contentResolver(fileName)
				getFromFile(file, contentType)
			})
		}
	}

	val route = pathPrefix("files"){
		put{ upload } ~
		get{ download }
	}
}
