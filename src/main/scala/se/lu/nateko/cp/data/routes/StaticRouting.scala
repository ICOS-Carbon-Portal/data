package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshalling.Marshaller
import akka.http.scaladsl.marshalling.Marshalling.WithOpenCharset
import akka.http.scaladsl.marshalling.ToResponseMarshaller
import akka.http.scaladsl.model.headers
import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.model.HttpCharset
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.MediaTypes
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives.*
import akka.http.scaladsl.server.PathMatcher1
import play.twirl.api.Html
import se.lu.nateko.cp.cpauth.core.PublicAuthConfig
import se.lu.nateko.cp.meta.core.data.EnvriConfigs

import scala.concurrent.Future
import eu.icoscp.envri.Envri

class StaticRouting()(using envriConfigs: EnvriConfigs) {
	import StaticRouting.pageMarshaller
	import UploadRouting.Sha256Segment
	private type PageFactory = PartialFunction[(String, Envri), Html]
	private val NetCdfProj = "netcdf"
	private val MapGraphProj = "map-graph"

	val projects = Set(
		NetCdfProj, "portal", "dygraph-light", "stats", "etcfacade", MapGraphProj,
		"dashboard", "lastDownloads", "imagezipview"
	)
	private val jsAppFolder = "frontendapps"

	private[this] val standardPageFactory: PageFactory = {
		case ("portal", envri) => views.html.PortalPage()(envri, envriConfigs(envri))
		case ("stats", envri) => views.html.StatsPage()(envri, envriConfigs(envri))
		case ("etcfacade", envri) => views.html.EtcFacadePage()(envri, envriConfigs(envri))
		case ("dygraph-light", envri) => views.html.DygraphLight()(envri, envriConfigs(envri))
		case ("dashboard", envri) => views.html.Dashboard()(envri, envriConfigs(envri))
	}

	private def maybeDobjVis(proj: String): PathMatcher1[PageFactory] = proj match {
		case NetCdfProj =>
			(Slash ~ Sha256Segment).?.tmap(x => x._1 match {
				case Some(_) =>
					Tuple1{case (NetCdfProj, envri) => views.html.NetCDFPage(true)(envri, envriConfigs(envri))}
				case None =>
					Tuple1{case (NetCdfProj, envri) => views.html.NetCDFPage(false)(envri, envriConfigs(envri))}
			})
		case MapGraphProj =>
			(Slash ~ Sha256Segment).?.tmap(_ =>
				Tuple1{case (MapGraphProj, envri) => views.html.MapGraph()(envri, envriConfigs(envri))}
			)
		case _ =>
			Neutral.tmap(_ => Tuple1(standardPageFactory))
	}

	private val extractEnvri = UploadRouting.extractEnvriAkkaDirective

	val route = (pathPrefix(Segment) & extractEnvri){case prEnvri @ (proj, _) =>

		if(!projects.contains(proj)) reject else {
			pathEnd{
				redirect("/" + proj + "/", StatusCodes.Found)
			} ~
			rawPathPrefix(maybeDobjVis(proj)){pageFactory =>
				val caches = Seq(headers.CacheDirectives.public, headers.CacheDirectives.`max-age`(86400))
				respondWithHeader(headers.`Cache-Control`(caches)){
					pathEndOrSingleSlash{
						if(pageFactory.isDefinedAt(prEnvri)) complete(pageFactory(prEnvri))
						else getFromResource(s"$jsAppFolder/$proj/$proj.html")
					} ~
					getFromResourceDirectory(s"$jsAppFolder/$proj")
				}
			}
		}
	} ~
	path("robots.txt"){
		getFromResource("robots.txt")
	}
}

object StaticRouting {
	implicit val pageMarshaller: ToResponseMarshaller[Html] = Marshaller(
		_ => html => Future.successful(
			WithOpenCharset(MediaTypes.`text/html`, getHtml(html, _)) :: Nil
		)
	)

	private def getHtml(html: Html, charset: HttpCharset) = HttpResponse(
		entity = HttpEntity(
			ContentType.WithCharset(MediaTypes.`text/html`, charset),
			html.body
		)
	)
}
