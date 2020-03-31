package se.lu.nateko.cp.data.test.streams.geo

import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point
import se.lu.nateko.cp.data.streams.geo.SegmentsIntersection.{forSegments, InnerPoints}

trait EnvelopePolygonHelpers {

	def add(lon: Double, lat: Double)(implicit poly: EnvelopePolygon): Boolean =
		poly.addVertice(new Point(lon, lat))

	def printarr(axis: String, extr: Point => Double)(points: collection.Seq[Point]): Unit =
		println(points.map(extr).mkString(s"$axis${points.size} = [", ", ", "]"))

	def printXarr(points: collection.Seq[Point]) = printarr("x", _.lon)(points)
	def printYarr(points: collection.Seq[Point]) = printarr("y", _.lat)(points)

	def round(p: Point) = Point(Math.rint(p.lon), Math.rint(p.lat))

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
