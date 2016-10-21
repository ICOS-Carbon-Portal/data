package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._

import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.Credentials._
import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.crypto.Md5Sum

object EtcUploadRouting {

	def apply()(implicit mat: Materializer): Route = (put & pathPrefix("upload" / "etc")){

		authenticateBasic("Carbon Portal", authenticator){user =>

			pathPrefix(Md5Segment){ md5 =>

				path(Segment){ fileName =>

					extractRequest{ req =>
						val md5Fut = req.entity.dataBytes.runWith(md5sink)
						onSuccess(md5Fut){gotMd5 =>
							if(md5 == gotMd5)
								complete(StatusCodes.OK)
							else
								complete((StatusCodes.BadRequest, "Checksum failure!"))
						}
					}

				} ~
				complete((StatusCodes.BadRequest, "Expected single URL segment with file name after the MD5 segment"))

			} ~
			complete((StatusCodes.BadRequest, "Expected hex-encoded MD5 sum as URL segment after 'upload/etc'"))
		}
	}

	private val Md5Segment = Segment.flatMap(Md5Sum.fromHex(_).toOption)

	private val authenticator: Authenticator[String] = {
		case Missing => None
		case creds @ Provided("station") => if(creds.verify("p4ssw0rd")) Some(creds.identifier) else None
		case _ => None
	}

	private val md5sink = DigestFlow.md5.to(Sink.ignore)
}
