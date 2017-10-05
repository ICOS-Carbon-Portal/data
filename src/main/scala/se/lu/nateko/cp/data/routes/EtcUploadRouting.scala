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
import se.lu.nateko.cp.data.services.etcfacade.FacadeService
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.KeepFuture
import se.lu.nateko.cp.meta.core.crypto.Md5Sum
import se.lu.nateko.cp.data.services.etcfacade.EtcFilename
import scala.util.Failure
import scala.util.Success
import akka.http.scaladsl.model.headers.Connection

object EtcUploadRouting {

	def apply(config: EtcFacadeConfig)(implicit mat: Materializer): Route = (put & pathPrefix("upload" / "etc")){
		import mat.executionContext

		val authenticator = AuthenticatorProvider(config)
		val facade = new FacadeService(config)

		authenticateBasic("Carbon Portal", authenticator){station =>

			pathPrefix(Md5Segment){ md5 =>

				path(Segment){ fileNameStr =>

					EtcFilename.parse(fileNameStr) match{

						case Failure(err) =>
							complete((StatusCodes.BadRequest, err.getMessage))

						case Success(file) =>
							if(file.station.id != station.id)
								forbid(s"This file must be uploaded by ${file.station.id}, not by ${station.id}!")

							else extractDataBytes { dataBytes =>
								val doneFut = dataBytes.runWith(facade.getFileSink(file, md5))

								onSuccess(doneFut){_ => complete(StatusCodes.OK)}
							}
					}
				} ~
				complete(StatusCodes.BadRequest -> "Expected single URL segment with file name after the MD5 segment")

			} ~
			complete(StatusCodes.BadRequest -> "Expected hex-encoded MD5 sum as URL segment after 'upload/etc'")
		} ~
		forbid("Authentication error")
	}

	private val Md5Segment = Segment.flatMap(Md5Sum.fromHex(_).toOption)

	private def forbid(msg: String): Route = respondWithHeader(Connection("close")){
		complete(StatusCodes.Forbidden -> msg)
	}
}
