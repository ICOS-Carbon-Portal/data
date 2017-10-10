package se.lu.nateko.cp.data.streams.geo

import scala.collection.mutable.Buffer
import scala.annotation.tailrec

class EnvelopePolygon {

	private[this] val verts = Buffer.empty[Point]

	def size: Int = verts.size

	def vertice(idx: Int): Point = verts(shortcircuit(idx))

	private def shortcircuit(idx: Int): Int = {
		val curSize = size
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
		if(size < 2) throw new NoSuchElementException("The polygon has no edges")
		val from = vertice(idx)
		val to = vertice(idx + 1)
		Math.atan2((to.lat - from.lat).toDouble, (to.lon - from.lon).toDouble)
	}

	def attachDegenerateVertice(baseVerticeIdx: Int, newVertice: Point): Unit = {
		if(size < 2) verts += newVertice
		else {
			val baseIdx = shortcircuit(baseVerticeIdx)
			val base = verts(baseIdx)
			verts.insert(baseIdx + 1, newVertice, base)
		}
	}

	override def toString = verts.mkString("Polygon[", ", ", "]")
}

object EnvelopePolygon{

	def angleDiff(from: Double, to: Double): Double = {
		val diff0 = to - from
		if(diff0 > Math.PI) diff0 - 2 * Math.PI
		else if(diff0 < - Math.PI) diff0 + 2 * Math.PI
		else diff0
	}
}
