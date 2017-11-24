package se.lu.nateko.cp.data.streams.geo

import scala.collection.mutable.Buffer
import scala.collection.mutable.Map
import scala.annotation.tailrec

import GeoAlgorithms._

class EnvelopePolygon(conf: EnvelopePolygonConfig) {
	import EnvelopePolygon._

	private val verts = Buffer.empty[Point]
	private[this] val edgeReplacements = Map.empty[Int, Point]

	def vertices: Seq[Point] = verts
	def vertice(idx: Int): Point = verts(shortcircuit(idx))
	def size: Int = verts.size

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

	def verticeCost(idx: Int): Double = if(!verticeIsConcave(idx)) Double.MaxValue else {
		val start = vertice(idx - 1)
		val stop = vertice(idx + 1)
		val self = vertice(idx)

		val allowedIntersections = ((idx - 2) to (idx + 1)).map(shortcircuit).toSet

		val noNewIntersections = verts.indices.forall{i =>
			import SegmentsIntersection._
			val v1 = verts(i); val v2 = vertice(i + 1)
			val inter = forSegments(v1, v2, start, stop)

			inter == NoIntersection ||
			inter == SingleVertice && allowedIntersections.contains(i) ||
			inter <= forSegments(v1, v2, start, self) ||
			inter <= forSegments(v1, v2, stop, self)
		}
		if(noNewIntersections) triangleArea2(start, self, stop) else Double.MaxValue
	}

	def edgeCost(idx: Int): Double = {
		val prev = edgeAngle(idx - 1)
		val curr = edgeAngle(idx)
		val next = edgeAngle(idx + 1)
		val diff = angleDiff(prev, next)

		if(diff >= 0 && diff < conf.maxAngleForEdgeRemoval){
			val diff1 = angleDiff(prev, curr)
			val diff2 = angleDiff(curr, next)

			if(diff1 >= 0 && diff2 >= 0){
				val start = vertice(idx)
				val stop = vertice(idx + 1)

				val top = if(diff > conf.minAngleForSimpleLineLineIntersection)
					lineLineIntersection(vertice(idx - 1), start, stop, vertice(idx + 2))
				else if(diff1 <= diff2)
					lineLineIntersection(vertice(idx + 2), stop, start, diff1, diff)
				else
					lineLineIntersection(vertice(idx - 1), start, stop, diff2, diff)

				edgeReplacements += idx -> top

				val allowedIntersections = Set(idx -1, idx, idx + 1).map(shortcircuit)

				val noNewIntersections = verts.indices.forall{i =>
					import SegmentsIntersection._
					val v1 = verts(i); val v2 = vertice(i + 1)
					Array(
						forSegments(v1, v2, start, top),
						forSegments(v1, v2, stop, top)
					).forall{inter =>
						inter == NoIntersection ||
						inter == SingleVertice && allowedIntersections.contains(i) ||
						inter <= forSegments(v1, v2, start, stop)
					}
				}
				if(noNewIntersections) triangleArea2(start, top, stop) else Double.MaxValue
			} else Double.MaxValue
		} else Double.MaxValue
	}

	def reduceVerticesByOne(): Boolean = {
		val curSize = verts.size
		if(curSize < 4) throw new NoSuchElementException("The polygon has no removeable vertices")

		val removal = (
			verts.indices.map(i => new VerticeRemoval(i, verticeCost(i), false)) ++
			verts.indices.map(i => new VerticeRemoval(i, edgeCost(i), true))
		).minBy(_.cost)

		if(removal.cost == Double.MaxValue) false
		else {
			val idx = removal.idx
			if(removal.isEdge){
				val vert = edgeReplacements(idx)
				if(idx < curSize - 1){
					verts.remove(idx, 2)
					verts.insert(idx, vert)
				} else {//TODO Write a test for this branch
					verts.remove(idx, 1)
					verts.insert(idx, vert)
					verts.remove(0, 1)
				}
			} else
				verts.remove(idx)
			true
		}
	}

	def containsPoint(p: Point): Boolean = {
		import EdgeRayRelationship._
		var isOnBorder = false
		var crossingCount = 0
		val iter = verts.indices.iterator
		val n = verts.size
		while(!isOnBorder && iter.hasNext){
			val idx = iter.next()
			computeRelationship(verts(idx), verts((idx + 1) % n), p) match{
				case Start => isOnBorder = true
				case Cross => crossingCount += 1
				case _ =>
			}
		}
		isOnBorder || (crossingCount % 2 != 0)
	}

	/***
	 * Adds a vertice, attaching it to the nearest edge with a degenerate near-zero-area protrusion.
	 * Effectively inserts 2 or 3 new vertices, depending on whether the nearest point on the nearest edge
	 * is a vertice or an inner point, respectively.
	 *
	 * returns false if the new vertice was inside the polygon (including border) and therefore has been discarded,
	 * true otherwise (i.e. the vertice has been added)
	 */
	def addVertice(vert: Point): Boolean = {
		val curSize = size
		if(curSize < 2) {
			if(verts.contains(vert)) false else {
				verts += vert
				true
			}
		}
		else !containsPoint(vert) && {

			val nearest = verts.indices.map{i =>
				val noe = nearestOnEdge(verts(i), verts((i + 1) % curSize), vert)
				noe.baseIdx = i + 1
				noe
			}.minBy(_.distSq)

			if(nearest.distSq < conf.minSquaredDistanceForNewVertice) false else {
				import NearestKind._

				nearest.kind match{

					case FirstVertice =>
						val v1 = nearest.point
						val ortho1 = orthoNormVector(vert, v1)
						val ortho2 = orthoNormVector(v1, verts(nearest.baseIdx % curSize))
						val nanoShifted = v1 + (ortho1 + ortho2) * conf.epsilon
						verts.insert(nearest.baseIdx, vert, nanoShifted)

					case SecondVertice =>
						val v2 = nearest.point
						val ortho1 = orthoNormVector(verts(nearest.baseIdx - 1), v2)
						val ortho2 = orthoNormVector(v2, vert)
						val nanoShifted = v2 + (ortho1 + ortho2) * conf.epsilon
						verts.insert(nearest.baseIdx, nanoShifted, vert)

					case InnerPoint =>
						val dist = Math.sqrt(nearest.distSq)
						val np = nearest.point
						val shifted = Point(
							np.lon + (vert.lon - np.lon) / dist * conf.epsilon,
							np.lat + (vert.lat - np.lat) / dist * conf.epsilon
						)
						//TODO Consider making two versions of 'shifted', shifted in slightly different directions
						verts.insert(nearest.baseIdx, shifted, vert, shifted)
				}
				true
			}
		}
	}

	override def toString = verts.mkString("Polygon[", ", ", "]")
}

object EnvelopePolygon{

	object defaultConfig extends EnvelopePolygonConfig{
		val maxAngleForEdgeRemoval: Double = 0.9 * Math.PI
		val minAngleForSimpleLineLineIntersection: Double = 0.001
		val minSquaredDistanceForNewVertice: Double = 1e-8
		val epsilon: Double = 1e-6
	}

	def defaultEmpty = new EnvelopePolygon(defaultConfig)

	def apply(vertices: TraversableOnce[Point])(conf: EnvelopePolygonConfig): EnvelopePolygon = {
		val p = new EnvelopePolygon(conf)
		p.verts ++= vertices
		p
	}

	def default(vertices: Point*) = apply(vertices)(defaultConfig)

	def angleDiff(from: Double, to: Double): Double = {
		val diff0 = to - from
		if(diff0 > Math.PI) diff0 - 2 * Math.PI
		else if(diff0 <= - Math.PI) diff0 + 2 * Math.PI
		else diff0
	}

	object NearestKind extends Enumeration{
		val FirstVertice, SecondVertice, InnerPoint = Value
	}

	class NearestOnEdge(val kind: NearestKind.Value, val point: Point, val distSq: Double){
		var baseIdx: Int = _
	}

	class VerticeRemoval(val idx: Int, val cost: Double, val isEdge: Boolean)

	def nearestOnEdge(v1: Point, v2: Point, p: Point): NearestOnEdge = {

		val factor: Double = {
			val nom = (v2.lon - v1.lon) * (p.lon - v1.lon) + (v2.lat - v1.lat) * (p.lat - v1.lat)
			nom / distSq(v1, v2)
		}

		import NearestKind._

		if(factor <= 0) new NearestOnEdge(FirstVertice, v1, distSq(p, v1))

		else if(factor >= 1) new NearestOnEdge(SecondVertice, v2, distSq(p, v2))

		else {
			val nearestPoint = Point(v1.lon + (v2.lon - v1.lon) * factor, v1.lat + (v2.lat - v1.lat) * factor)
			//new vertices cannot be attached to a polygon edge from the "internal side" of it:
			val cost = if(side(v1, v2, p) > 0) Double.MaxValue else distSq(p, nearestPoint)
			new NearestOnEdge(InnerPoint, nearestPoint, cost)
		}
	}
}
