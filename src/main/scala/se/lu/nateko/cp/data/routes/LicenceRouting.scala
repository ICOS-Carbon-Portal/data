package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.headers.HttpCookie
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.server.Directive1

import spray.json._
import scala.util.Try

import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.crypto.JsonSupport._
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.objectPathPrefix
import se.lu.nateko.cp.meta.core.data.collectionPathPrefix
import se.lu.nateko.cp.meta.core.HandleProxiesConfig

class LicenceRouting(userOpt: Directive1[Option[UserId]], handleProxies: HandleProxiesConfig)(implicit envriConfs: EnvriConfigs) {

	import LicenceRouting._

	private def dataLicence(prof: LicenceProfile): Route = dataLicenceRoute(prof, userOpt, handleProxies)

	def route: Route = parameter(("ids".as[Array[Sha256Sum]], "fileName".?, "isColl".as[Boolean] ? false)){(hashes, fileOpt, isColl) =>

		val profile = new UriLicenceProfile(hashes.toIndexedSeq, fileOpt, isColl)

		path(LicenceAcceptPath){
			val target = profile.downloadUri
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
				dataLicence(profile)
		}
	} ~ path(LicencePath){
		dataLicence(defaultLicenceProfile)
	}
}

object LicenceRouting{

	val LicenceCookieName = "CpLicenseAcceptedFor"
	val LicencePath = "licence"
	val LicenceAcceptPath = "licence_accept"

	def defaultLicenceProfile = new UriLicenceProfile(Nil, None, false)

	sealed trait LicenceProfile

	class FormLicenceProfile(hashes: Seq[Sha256Sum], fileName: String) extends LicenceProfile{
		def formInfo: Option[Map[String, String]] = if(hashes.isEmpty) None else Some(
			Map(
				"ids" -> hashes.toJson.compactPrint,
				"fileName" -> fileName,
				"licenceOk" -> "true"
			)
		)
	}
	class UriLicenceProfile(hashes: Seq[Sha256Sum], fileName: Option[String], isColl: Boolean) extends LicenceProfile{

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
		value.split('|').map(Sha256Sum.fromBase64Url(_).get).toIndexedSeq
	}

	def dataLicenceRoute(
		profile: LicenceProfile, userOpt: Directive1[Option[UserId]], handleProxies: HandleProxiesConfig
	)(implicit envriConfs: EnvriConfigs): Route = {

		import StaticRouting.pageMarshaller
		val extractEnvri = UploadRouting.extractEnvriDirective

		extractEnvri{implicit envri =>
			userOpt{uidOpt =>
				val loginUri: Option[Uri] = if(uidOpt.isEmpty){
					val envriConf = envriConfs(envri)
					val uriStr = "https://" + envriConf.authHost
					Some(Uri(uriStr))
				} else None
				complete(views.html.LicencePage(profile, loginUri, handleProxies))
			}
		}
	}

}
