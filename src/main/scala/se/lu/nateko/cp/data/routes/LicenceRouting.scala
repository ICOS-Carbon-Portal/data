package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import akka.http.scaladsl.model.headers.HttpCookie
import akka.http.scaladsl.model.StatusCodes

class LicenceRouting(auth: AuthRouting) {

	import LicenceRouting._
	import UploadRouting.Sha256Segment

	def route: Route =
		path("licence_accept" / Sha256Segment){hash =>
			setCookie(HttpCookie(LicenceCookieName, hash.base64)){
				redirect("/objects/" + hash.base64Url, StatusCodes.Found)
			}
		} ~
		pathPrefix("licence"){
			complete((StatusCodes.OK, "Under construction!"))
		}

}

object LicenceRouting{

	val LicenceCookieName = "CpLicenseAcceptedFor"

}
