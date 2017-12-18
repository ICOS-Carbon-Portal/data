package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.marshalling.ToResponseMarshaller
import akka.http.scaladsl.model.StatusCodes
import play.twirl.api.Html
import akka.http.scaladsl.marshalling.Marshaller
import akka.http.scaladsl.model.HttpCharset
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.marshalling.Marshalling.WithOpenCharset
import akka.http.scaladsl.model.MediaTypes

import scala.concurrent.Future
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.server.{PathMatcher, PathMatcher1}
import se.lu.nateko.cp.data.ConfigReader

object StaticRouting {

	private type PageFactory = PartialFunction[String, Html]
	private val NetCdfProj = "netcdf"

	val authConfig = ConfigReader.getDefault.auth
	val projects = Set(NetCdfProj, "portal", "wdcgg", "stilt", "dygraph-light", "stats", "etcfacade")

	private[this] val standardPageFactory: PageFactory = {
		case "stilt" => views.html.StiltPage()
		case "wdcgg" => views.html.WdcggPage()
		case "portal" => views.html.PortalPage(authConfig)
		case "stats" => views.html.StatsPage()
		case "etcfacade" => views.html.EtcFacadePage(authConfig)
	}

	implicit val pageMarshaller: ToResponseMarshaller[Html] = Marshaller(
		implicit exeCtxt => html => Future.successful(
			WithOpenCharset(MediaTypes.`text/html`, getHtml(html, _)) :: Nil
		)
	)

	private def getHtml(html: Html, charset: HttpCharset) = HttpResponse(
		entity = HttpEntity(
			ContentType.WithCharset(MediaTypes.`text/html`, charset),
			html.body
		)
	)

	private def maybeSha256SumIfNetCdfProj(proj: String): PathMatcher1[PageFactory] = proj match {
		case NetCdfProj =>
			(Slash ~ UploadRouting.Sha256Segment).?.tmap(x => x._1 match {
				case Some(_) =>
					Tuple1{case NetCdfProj => views.html.NetCDFPage(true)}
				case None =>
					Tuple1{case NetCdfProj => views.html.NetCDFPage(false)}
			})
		case _ =>
			Neutral.tmap(_ => Tuple1(standardPageFactory))
	}

	val route = pathPrefix(Segment){proj =>
		if(projects.contains(proj)){
			pathEnd{
				redirect("/" + proj + "/", StatusCodes.Found)
			} ~
			rawPathPrefix(maybeSha256SumIfNetCdfProj(proj)){pageFactory =>
				path(Segment){fileName =>
					if(fileName.startsWith(proj + "."))
						getFromResource(fileName)
					else reject
				} ~ (
				if(pageFactory.isDefinedAt(proj)){
					complete(pageFactory(proj))
				} else pathSingleSlash{
					getFromResource(proj + ".html")
				})
			}
		} else reject
	}
}
