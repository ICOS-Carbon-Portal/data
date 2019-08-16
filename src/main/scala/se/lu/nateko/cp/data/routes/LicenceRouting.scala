package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.headers.HttpCookie
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri

import spray.json._

import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.crypto.JsonSupport._
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.EnvriConfig
import se.lu.nateko.cp.meta.core.data.{staticObjLandingPage, objectPathPrefix}
import se.lu.nateko.cp.meta.core.data.{staticCollLandingPage, collectionPathPrefix}
import se.lu.nateko.cp.meta.core.HandleProxiesConfig

import scala.concurrent.Future
import scala.util.Try

class LicenceRouting(authRouting: AuthRouting, handleProxies: HandleProxiesConfig)(implicit envriConfs: EnvriConfigs) {

	import LicenceRouting._
	import StaticRouting.pageMarshaller
	import authRouting.userOpt
	private val extractEnvri = UploadRouting.extractEnvriDirective

	def route: Route = parameter(('ids.as[Seq[Sha256Sum]], 'fileName.?, 'isColl.as[Boolean] ? false)){(hashes, fileOpt, isColl) =>

		val uris = new UriMaker(hashes, fileOpt, isColl)

		path(LicenceAcceptPath){
			val target = uris.downloadUri
			val cookie = HttpCookie(
				LicenceCookieName,
				hashes.map(_.base64Url).mkString("|"),
				path = Some(target.path.toString)
			)
			setCookie(cookie){
				redirect(target, StatusCodes.Found)
			}
		} ~
		path(LicencePath){
				dataLicence(uris)
		}
	} ~ path(LicencePath){dataLicence(new UriMaker(Nil, None, false))}

	private def dataLicence(uris: UriMaker): Route = {
		extractEnvri{implicit envri =>
			userOpt{uidOpt =>
				val loginUri: Option[Uri] = if(uidOpt.isEmpty && envri == Envri.ICOS){
					val envriConf = envriConfs(envri)
					val uriStr = "https://" + envriConf.authHost
					Some(Uri(uriStr))
				} else None
				complete(views.html.LicencePage(uris.licenceAcceptUri, loginUri, handleProxies))
			}
		}
	}
}

object LicenceRouting{

	val LicenceCookieName = "CpLicenseAcceptedFor"
	val LicencePath = "licence"
	val LicenceAcceptPath = "licence_accept"

	class UriMaker(hashes: Seq[Sha256Sum], fileName: Option[String], isColl: Boolean){

		def downloadUri = {
			val prefix = (if(isColl) collectionPathPrefix else objectPathPrefix).stripSuffix("/")

			if(hashes.size == 1 && (isColl || fileName.isEmpty))
				Uri(s"/${prefix}/${hashes.head.id}")
			else
				hashesUri("/" + prefix, false)
		}

		def licenceAcceptUri: Option[Uri] = if(hashes.isEmpty) None else Some(hashesUri("/" + LicenceAcceptPath))

		def licenceUri = hashesUri("/" + LicencePath)

		private def hashesUri(uri: String, includeCollInfo: Boolean = true): Uri = {
			val fnParam = fileName.filter(_ => !isColl).map("fileName" -> _).toSeq

			val collParam = if(includeCollInfo && isColl) Seq("isColl" -> "true") else Nil

			val params = ("ids", hashes.toJson.compactPrint) +: fnParam ++: collParam

			Uri(uri).withQuery(Uri.Query(params :_*))
		}

	}

	def parseLicenceCookie(value: String): Try[Seq[Sha256Sum]] = Try{
		value.split('|').map(Sha256Sum.fromBase64Url(_).get)
	}

}
