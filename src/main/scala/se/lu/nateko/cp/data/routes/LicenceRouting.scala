package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import akka.http.scaladsl.model.headers.HttpCookie
import akka.http.scaladsl.model.StatusCodes
import spray.json._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.unmarshalling.Unmarshaller
import scala.concurrent.Future
import scala.util.Try

class LicenceRouting(authRouting: AuthRouting) {

	import LicenceRouting._
	import UploadRouting.Sha256Segment
	import StaticRouting.pageMarshaller
	import authRouting.user

	def route: Route = parameter(('ids.as[Seq[Sha256Sum]], 'fileName.?)){(dobjs, fileOpt) =>
		path("licence_accept"){
			val target = downloadUri(dobjs, fileOpt)
			val cookie = HttpCookie(
				LicenceCookieName,
				dobjs.map(_.base64Url).mkString("|"),
				path = Some(target.path.toString)
			)
			setCookie(cookie){
				redirect(target, StatusCodes.Found)
			}
		} ~
		path("licence"){
				dataLicence(dobjs, fileOpt)
		}
	} ~ path("licence"){dataLicence(Nil, None)}

	private def dataLicence(dobjIds: Seq[Sha256Sum], fileName: Option[String]): Route = {
		user{uid =>
			complete(views.html.LicencePage(Some(uid), dobjIds, fileName))
		} ~
		complete(views.html.LicencePage(None, dobjIds, fileName))
	}
}

object LicenceRouting{

	val LicenceCookieName = "CpLicenseAcceptedFor"

	def downloadUri(dobjs: Seq[Sha256Sum], fileName: Option[String]) = {
		if(fileName.isEmpty && dobjs.size == 1)
			Uri("/objects/" + dobjs.head.base64Url)
		else dobjsUri("/objects", dobjs, fileName)
	}

	def licenceAcceptUri(dobjs: Seq[Sha256Sum], fileName: Option[String]) = dobjsUri("/licence_accept", dobjs, fileName)
	def licenceUri(dobjs: Seq[Sha256Sum], fileName: Option[String]) = dobjsUri("/licence", dobjs, fileName)

	def licenceRejectUri(hashes: Seq[Sha256Sum]): Uri = {
		if(hashes.size == 1)
			Uri("https://meta.icos-cp.eu/objects/" + hashes.head.base64Url)
		else
			Uri("#")
	}

	private def dobjsUri(uri: String, dobjs: Seq[Sha256Sum], fileName: Option[String]): Uri = {
		val params = ("ids", dobjs.toJson.compactPrint) :: fileName.map("fileName" -> _).toList

		Uri(uri).withQuery(Uri.Query(params :_*)).toString
	}

	def parseLicenceCookie(value: String): Future[Seq[Sha256Sum]] = Future.fromTry(Try{
		value.split('|').map(Sha256Sum.fromBase64Url(_).get)
	})

}
