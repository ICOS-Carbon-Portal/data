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

class FileRouting(authRouting: AuthRouting, fileService: FileStorageService)(implicit mat: Materializer) {

	private implicit val ex = mat.executionContext
	private[this] val shaPattern = """[0-9a-fA-F]{64}""".r.pattern

	private def ensureSha256(inner: String => Route): String => Route = hashSum => {
		if(shaPattern.matcher(hashSum).matches) inner(hashSum.toLowerCase)
		else throw new Exception("Invalid SHA-256 sum, expecting a 32-byte hexadecimal string")
	}

	private val upload: Route = path(Segment){
		ensureSha256{ hashsum =>
			authRouting.user{ uinfo =>
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
