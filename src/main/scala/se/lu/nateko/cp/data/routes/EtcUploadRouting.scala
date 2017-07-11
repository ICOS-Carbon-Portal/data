package se.lu.nateko.cp.data.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import akka.stream.Materializer
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.EtcFacadeConfig
import se.lu.nateko.cp.data.services.etcfacade.AuthenticatorProvider
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.KeepFuture
import se.lu.nateko.cp.meta.core.crypto.Md5Sum

object EtcUploadRouting {

	def apply(config: EtcFacadeConfig)(implicit mat: Materializer): Route = (put & pathPrefix("upload" / "etc")){
		import mat.executionContext

		val authenticator = AuthenticatorProvider(config)

		authenticateBasic("Carbon Portal", authenticator){station =>

			pathPrefix(Md5Segment){ md5 =>

				path(Segment){ fileName =>

					extractRequest{ req =>
						val md5Fut = req.entity.dataBytes.runWith(dataMd5Sink)
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

	private def dataMd5Sink(implicit ctxt: ExecutionContext): Sink[ByteString, Future[Md5Sum]] = {
		Flow.apply[ByteString].viaMat(DigestFlow.md5)(Keep.right).toMat(Sink.ignore)(KeepFuture.left)
	}
}
