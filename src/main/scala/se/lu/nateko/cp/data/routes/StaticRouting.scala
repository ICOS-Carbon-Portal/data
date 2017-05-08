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

object StaticRouting {

	val projects = Set("netcdf", "portal", "wdcgg", "stilt", "dygraph-light", "netcdf-light")

	private[this] val pages: PartialFunction[String, Html] = {
		case "stilt" => views.html.StiltPage()
		case "netcdf" => views.html.NetCDFPage()
		case "wdcgg" => views.html.WdcggPage()
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

	val route = pathPrefix(Segment){ proj =>

		if(projects.contains(proj)){

			pathEnd{
				redirect("/" + proj + "/", StatusCodes.Found)
			} ~
			pathSingleSlash{
				if(pages.isDefinedAt(proj)){
					complete(pages(proj))
				} else getFromResource(proj + ".html")
			} ~
			path(Segment){fileName =>
				if(fileName.startsWith(proj + "."))
					getFromResource(fileName)
				else reject
			}

		} else reject

	}
}