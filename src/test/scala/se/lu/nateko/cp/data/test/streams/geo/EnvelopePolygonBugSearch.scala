package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSuite
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point
import se.lu.nateko.cp.data.streams.geo.SegmentsIntersection.{forSegments, InnerPoints}
import scala.util.Random

class EnvelopePolygonBugSearch extends FunSuite{

	private val rnd = new Random

	def getRandomPoint(): Point = {
		val lon = -180 + 360 * rnd.nextDouble()
		val lat = -90 + 180 * rnd.nextDouble()
		Point(lon, lat)
	}

	test("Try producing self-intersecting polygon state"){
		var found = false
		for(_ <- (1 to 1000) if !found){
			val nstart = 30
			//val nstop = 5
			val startPoints = IndexedSeq.fill(nstart)(getRandomPoint())
			val poly = new EnvelopePolygon
			startPoints.foreach(poly.addVertice)
			while(poly.size > nstart && poly.reduceVerticesByOne()){}
			if(EnvelopePolygonBugSearch.selfIntersects(poly)){
				found = true
				println(startPoints.mkString(", "))
				println(poly.vertices.mkString(", "))
			}//else println("OK")
		}
	}
}

object EnvelopePolygonBugSearch{

	def selfIntersects(poly: EnvelopePolygon): Boolean = {
		val edges: IndexedSeq[(Point, Point)] = poly.vertices.indices.map{i =>
			(poly.vertice(i), poly.vertice((i + 1) % poly.size))
		}

		edges.indices.exists{i =>
			edges.indices.drop(i + 2).exists{j =>
				val e1 = edges(i)
				val e2 = edges(j)
				forSegments(e1._1, e1._2, e2._1, e2._2) == InnerPoints
			}
		}
	}
}