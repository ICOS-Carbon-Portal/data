package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.RawHeader
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.Route
import akka.stream.Materializer
import se.lu.nateko.cp.data.EtcFacadeConfig
import se.lu.nateko.cp.data.services.etcfacade.AuthenticatorProvider
import se.lu.nateko.cp.data.services.etcfacade.EtcFilename
import se.lu.nateko.cp.data.services.etcfacade.FacadeService
import se.lu.nateko.cp.data.services.etcfacade.UploadReceiptCrypto
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.crypto.Md5Sum
import se.lu.nateko.cp.meta.core.etcupload.StationId
import se.lu.nateko.cp.data.utils.akka.{gracefulForbid, gracefulBadReq}
import spray.json.*

import java.time.LocalDate
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

class EtcUploadRouting(
	auth: AuthRouting, config: EtcFacadeConfig, upload: UploadService
)(using mat: Materializer) extends SprayRouting{
	import EtcUploadRouting._
	import mat.executionContext

	private val facade = new FacadeService(config, upload)
	private val receiptCrypto = new UploadReceiptCrypto(config.secret)
	private val meta = upload.meta

	def route: Route = pathPrefix("upload" / "etc"){
		uploadRoute ~
		pathPrefix("staging"){
			getFromBrowseableDirectory(config.folder)
		} ~
		get {
			path("passwords"){
				auth.userOpt{userOpt =>
					val passesFut: Future[JsObject] = userOpt
						.map(uid => meta.getStationsWhereUserIsPi(uid).map(Some.apply))
						.getOrElse(Future.successful(None))
						.map(getPassList(config, _))
					onSuccess(passesFut){json => complete(json)}
				}
			} ~
			path("receipt" / Segment){receiptStr =>
				receiptCrypto.decrypt(receiptStr) match {
					case Success(receipt) =>
						complete(StatusCodes.OK -> receipt.report)
					case Failure(err) =>
						complete(StatusCodes.BadRequest -> ("Invalid receipt:\n" + err.getMessage))
				}
			}
		}
	}

	private def uploadRoute: Route = put{

		val authenticator = AuthenticatorProvider(config)

		authenticateBasic("Carbon Portal", authenticator){station =>

			pathPrefix(Md5Segment){ md5 =>

				blacklistedMd5.get(md5).map(gracefulBadReq).getOrElse{
					path(Segment){ fileNameStr =>

						EtcFilename.parse(fileNameStr) match

							case Failure(err) =>
								gracefulBadReq(err.getMessage)

							case Success(file) =>
								if file.station.id != station.id
								then gracefulForbid(s"This file must be uploaded by ${file.station.id}, not by ${station.id}!")

								else if file.date.compareTo(LocalDate.now().plusDays(1)) > 0
								then gracefulForbid(s"File name date ${file.date} is in the future, cannot be right")

								else if file.date.compareTo(LocalDate.of(2010, 1, 1)) < 0
								then gracefulForbid(s"File name date ${file.date} is too far in the past")

								else extractDataBytes { dataBytes =>
									val doneFut = dataBytes.runWith(facade.getFileSink(file, md5))

									onSuccess(doneFut){_ =>
										val receipt = receiptCrypto.encryptNow(file, md5)
										respondWithHeader(RawHeader("X-ICOSCP-Receipt", receipt)){
											complete(StatusCodes.OK)
										}
									}
								}
						end match
					} ~
					gracefulBadReq("Expected single URL segment with file name after the MD5 segment")
				}
			} ~
			gracefulBadReq("Expected hex-encoded MD5 sum as URL segment after 'upload/etc'")
		} ~
		gracefulForbid("Authentication error")
	}
}

object EtcUploadRouting{

	val Md5Segment = Segment.flatMap(Md5Sum.fromHex(_).toOption)

	private val EmptyMd5 = Md5Sum.fromHex("d41d8cd98f00b204e9800998ecf8427e").get

	val blacklistedMd5: Map[Md5Sum, String] = Map(
		EmptyMd5 -> "MD5 checksum corresponds to an empty file"
	)

	def getPassList(config: EtcFacadeConfig, stationsOpt: Option[Seq[StationId]]): JsObject = {
		val statArray: JsValue = stationsOpt.map{stations =>
			JsArray(stations.map{s =>
				val pass = AuthenticatorProvider.getPassword(s, config)
				JsObject(Map("station" -> JsString(s.id), "password" -> JsString(pass)))
			}.toVector)
		}.getOrElse(JsNull)
		JsObject(Map("passwords" -> statArray))
	}
}
