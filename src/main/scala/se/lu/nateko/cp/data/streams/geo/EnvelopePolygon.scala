package se.lu.nateko.cp.data.streams.geo

import scala.collection.mutable.Buffer
import scala.annotation.tailrec

class EnvelopePolygon {
	import EnvelopePolygon._

	private[this] val verts = Buffer.empty[Point]

	def vertices: Seq[Point] = verts
	def vertice(idx: Int): Point = verts(shortcircuit(idx))

	private def shortcircuit(idx: Int): Int = {
		val curSize = verts.size
		if(curSize == 0) throw new NoSuchElementException("The polygon has no vertices")

		@tailrec def inner(idx: Int): Int = {
			if(curSize == 1) 0
			else if(idx < - curSize) inner(idx % curSize)
			else if(idx < 0) idx + curSize
			else idx % curSize
		}
		inner(idx)
	}

	def edgeAngle(idx: Int): Double = {
		if(verts.size < 2) throw new NoSuchElementException("The polygon has no edges")
		val from = vertice(idx)
		val to = vertice(idx + 1)
		Math.atan2((to.lat - from.lat).toDouble, (to.lon - from.lon).toDouble)
	}

	def verticeIsConcave(idx: Int): Boolean =
		angleDiff(edgeAngle(idx - 1), edgeAngle(idx)) <= 0

	//TODO Add memoization
	def verticeCost(idx: Int): Double = if(!verticeIsConcave(idx)) Double.MaxValue else
		triangleArea2(vertice(idx - 1), vertice(idx), vertice(idx + 1))

	def edgeIsConvex(idx: Int): Boolean = if(verts.size < 4) false else {
		val prev = edgeAngle(idx - 1)
		val curr = edgeAngle(idx)
		val next = edgeAngle(idx + 1)
		val diff = angleDiff(prev, next)
		angleDiff(prev, curr) > 0 && angleDiff(curr, next) > 0 && diff >= 0 && diff < Math.PI
	}

	//TODO Add memoization
	def edgeCost(idx: Int): Double = if(!edgeIsConvex(idx)) Double.MaxValue else {
		val start = vertice(idx)
		val stop = vertice(idx + 1)
		val top = lineLineIntersection(vertice(idx - 1), start, stop, vertice(idx + 2))
		triangleArea2(start, top, stop)
	}

	def reduceVerticesByOne: Unit = {
		if(verts.size < 4) throw new NoSuchElementException("The polygon has no removeable vertices")
		val cheapestVertice = verts.indices.minBy(verticeCost _)
		val cheapestEdge = verts.indices.minBy(edgeCost _)
		if(edgeCost(cheapestEdge) < verticeCost(cheapestVertice)){
			val idx = cheapestEdge
			val vert = lineLineIntersection(vertice(idx - 1), vertice(idx), vertice(idx + 1), vertice(idx + 2))
			verts.remove(idx, 2)
			verts.insert(idx, vert)
		} else {
			verts.remove(cheapestVertice)
		}
	}

	//TODO Implement
	def isInside(p: Point): Boolean = false

	/***
	 * returns false if the new vertice was strictly inside the polygon and therefore has been discarded,
	 * true otherwise
	 */
	def addVertice(vert: Point): Boolean = {
		if(verts.size < 2) {
			verts += vert
			true
		}
		else !isInside(vert) && {
			val baseIdx = verts.indices.minBy{i =>
				val vi = verts(i)
				val dx = vi.lon - vert.lon
				val dy = vi.lat - vert.lat
				dx * dx + dy * dy
			}
			val base = verts(baseIdx)
			verts.insert(baseIdx + 1, vert, base)
			true
		}
	}

	override def toString = verts.mkString("Polygon[", ", ", "]")
}

object EnvelopePolygon{

	def angleDiff(from: Double, to: Double): Double = {
		val diff0 = to - from
		if(diff0 > Math.PI) diff0 - 2 * Math.PI
		else if(diff0 <= - Math.PI) diff0 + 2 * Math.PI
		else diff0
	}

	def triangleArea2(a: Point, b: Point, c: Point): Double = Math.abs(
		(a.lon - c.lon) * (b.lat - a.lat) - (a.lon - b.lon) * (c.lat - a.lat)
	).toDouble

	def lineLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point = {
		val denom = (p1.lon - p2.lon) * (p3.lat - p4.lat) - (p1.lat - p2.lat) * (p3.lon - p4.lon)

		if(denom == 0) new Point((p2.lon + p3.lon) / 2, (p2.lat + p3.lat) / 2) else {

			val xnom = (p1.lon * p2.lat - p1.lat * p2.lon) * (p3.lon - p4.lon) -
				(p1.lon - p2.lon) * (p3.lon * p4.lat - p3.lat * p4.lon)

			val ynom = (p1.lon * p2.lat - p1.lat * p2.lon) * (p3.lat - p4.lat) -
				(p1.lat - p2.lat) * (p3.lon * p4.lat - p3.lat * p4.lon)

			new Point(xnom / denom, ynom / denom)
		}
	}
}
