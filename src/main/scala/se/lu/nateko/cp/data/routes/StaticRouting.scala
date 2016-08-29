package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.model.StatusCodes

object StaticRouting {

	val projects = Set("netcdf", "portal", "stilt")

	val route = pathPrefix(Segment){ proj =>

		if(projects.contains(proj)){

			pathEnd{
				redirect("/" + proj + "/", StatusCodes.Found)
			} ~
			pathSingleSlash{
				getFromResource(proj + ".html")
			} ~
			path(Segment){fileName =>
				if(fileName.startsWith(proj + "."))
					getFromResource(fileName)
				else reject
			}

		} else reject

	}
}