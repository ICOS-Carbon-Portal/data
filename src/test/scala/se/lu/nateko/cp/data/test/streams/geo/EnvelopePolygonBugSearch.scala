package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point
import scala.util.Random

class EnvelopePolygonBugSearch extends AnyFunSuite with EnvelopePolygonHelpers{

	private val rnd = new Random

	def getRandomPoint(): Point = {
		val lon = -180 + 360 * rnd.nextDouble()
		val lat = -90 + 180 * rnd.nextDouble()
		Point(lon, lat)
	}

	def prefill(startPoints: Seq[Point]) = {
		val poly = EnvelopePolygon.defaultEmpty
		startPoints.foreach(poly.addVertice)
		poly
	}

	def getBadStart(nIter: Int, nstart: Int): Option[EnvelopePolygon] = {

		def generateRandom = IndexedSeq.fill(nstart)(getRandomPoint())

		Iterator.fill(nIter)(generateRandom).find{startPoints =>
			val poly = prefill(startPoints)
			while(poly.size > nstart && poly.reduceVerticesByOne().isRight){}
			selfIntersects(poly)
		}.map(prefill)
	}

	test("Trying to produce self-intersecting polygon state fails"){
		getBadStart(30, 30) match{
			case Some(poly) =>
				var prevVerts = poly.vertices.toVector

				while(!selfIntersects(poly)){
					prevVerts = poly.vertices.toVector
					poly.reduceVerticesByOne()
				}
				println("Counterexample found:")
				printXarr(prevVerts)
				printYarr(prevVerts)
				printXarr(poly.vertices)
				printYarr(poly.vertices)
				fail("Got a polygon in a self-intersecting state!")
			case None =>
				succeed
		}
	}
}
