package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import akka.http.scaladsl.model.headers.HttpCookie
import akka.http.scaladsl.model.StatusCodes

class LicenceRouting(authRouting: AuthRouting) {

	import LicenceRouting._
	import UploadRouting.Sha256Segment
	import StaticRouting.pageMarshaller
	import authRouting.user

	def route: Route =
		path("licence_accept" / Sha256Segment){hash =>
			val dlPath = "/objects/" + hash.base64Url
			setCookie(HttpCookie(LicenceCookieName, hash.base64Url, path = Some(dlPath))){
				redirect(dlPath, StatusCodes.Found)
			}
		} ~
		pathPrefix("licence"){
			pathEndOrSingleSlash{dataLicence(None)} ~
			path(Sha256Segment){hash => dataLicence(Some(hash))}
		}

	private def dataLicence(dobjId: Option[Sha256Sum]): Route = {
		user{uid =>
			complete(views.html.LicencePage(Some(uid), dobjId))
		} ~
		complete(views.html.LicencePage(None, dobjId))
	}
}

object LicenceRouting{

	val LicenceCookieName = "CpLicenseAcceptedFor"

}
