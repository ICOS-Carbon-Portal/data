package se.lu.nateko.cp.data.streams.geo

import scala.annotation.tailrec
import scala.collection.mutable.Buffer
import scala.collection.mutable.Map
import Ordering.Double.TotalOrdering

import GeoAlgorithms._
import se.lu.nateko.cp.meta.core.data.Polygon
import se.lu.nateko.cp.meta.core.data.Position

class EnvelopePolygon(conf: EnvelopePolygonConfig) {
	import EnvelopePolygon._

	private val verts = Buffer.empty[Point]
	private val nearests = Buffer.empty[Point]
	private[this] val edgeReplacements = Map.empty[Int, Point]

	def vertices: collection.Seq[Point] = verts
	def vertice(idx: Int): Point = verts(shortcircuit(idx))
	def nearestTo(idx: Int): Point = nearests(shortcircuit(idx))
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
		Math.atan2(to.lat - from.lat, to.lon - from.lon)
	}

	def verticeIsConcave(idx: Int): Boolean =
		angleDiff(edgeAngle(idx - 1), edgeAngle(idx)) <= conf.convexnessToleranceAngle

	def verticeCost(idx: Int): Double = if(!verticeIsConcave(idx)) Double.MaxValue else {
		val start = vertice(idx - 1)
		val stop = vertice(idx + 1)
		val self = vertice(idx)

		val allowedIntersections = ((idx - 2) to (idx + 1)).map(shortcircuit).toSet

		val noNewIntersections = verts.indices.forall{i =>
			import SegmentsIntersection.*
			val v1 = verts(i); val v2 = vertice(i + 1)
			val inter = forSegments(v1, v2, start, stop)

			inter == NoIntersection ||
			inter == SingleVertice && allowedIntersections.contains(i) ||
			inter.ordinal <= forSegments(v1, v2, start, self).ordinal ||
			inter.ordinal <= forSegments(v1, v2, stop, self).ordinal
		}
		if(noNewIntersections)
			triangleArea2(start, self, stop)
		else Double.MaxValue
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
					import SegmentsIntersection.*
					val v1 = verts(i); val v2 = vertice(i + 1)
					Array(
						forSegments(v1, v2, start, top),
						forSegments(v1, v2, stop, top)
					).forall{inter =>
						inter == NoIntersection ||
						inter == SingleVertice && allowedIntersections.contains(i) ||
						inter.ordinal <= forSegments(v1, v2, start, stop).ordinal
					}
				}
				if(noNewIntersections){
					val near1 = nearestTo(idx)
					val near2 = nearestTo(idx + 1)
					val distanceCost = minDistSq(top, near1, near2, midPoint(near1, near2))
					triangleArea2(start, top, stop) + conf.distanceCostFactor * distanceCost
				} else Double.MaxValue
			} else Double.MaxValue
		} else Double.MaxValue
	}

	def reduceVerticesByOne(costLimit: Double = Double.MaxValue): Either[Double, Double] = {
		val curSize = verts.size
		if(curSize < 4) throw new NoSuchElementException("The polygon has no removeable vertices")

		val removal = (
			verts.indices.map(i => new VerticeRemoval(i, verticeCost(i), false)) ++
			verts.indices.map(i => new VerticeRemoval(i, edgeCost(i), true))
		).minBy(_.cost)

//		if(removal.cost >= costLimit && costLimit < Double.MaxValue){
//			println(s"Rejecting cost ${removal.cost} due to limit $costLimit")
//		}

		if(removal.cost >= costLimit) Left(removal.cost)
		else {
			val idx = removal.idx
			if(removal.isEdge){
				val vert = edgeReplacements(idx)
				if(idx < curSize - 1){
					verts.remove(idx, 2)
					verts.insert(idx, vert)
					val near1 = nearests(idx)
					val near2 = nearests(idx + 1)
					val newNearest = nearestPoint(vert, near1, near2, midPoint(near1, near2))
					nearests.remove(idx, 2)
					nearests.insert(idx, newNearest)
				} else {//TODO Write a test for this branch
					verts.remove(idx, 1)
					verts(0) = vert
					val near1 = nearests(0)
					val near2 = nearests(idx)
					val newNearest = nearestPoint(vert, near1, near2, midPoint(near1, near2))
					nearests.remove(idx, 1)
					nearests(0) = newNearest
				}
			} else {
				verts.remove(idx)
				nearests.remove(idx)
			}
			Right(removal.cost)
		}
	}

	def containsPoint(p: Point): Boolean = {
		import EdgeRayRelationship._
		var isOnBorder = false
		var crossingCount = 0
		val iter = verts.indices.iterator
		val n = verts.size
		while(iter.hasNext){
			val idx = iter.next()

			//Updating nearest points for vertices to which p is closer than their current nearest
			if(distSq(verts(idx), nearests(idx)) > distSq(verts(idx), p)) nearests(idx) = p

			if(!isOnBorder) computeRelationship(verts(idx), verts((idx + 1) % n), p) match{
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
	 * returns false if the new vertice was inside the polygon (including border) or very close to it and
	 * therefore has been discarded, true otherwise (i.e. the vertice has been added)
	 */
	def addVertice(vert: Point): Boolean = {
		val curSize = size
		if(curSize < 2) {
			if(verts.contains(vert)) false else {
				verts += vert
				nearests += vert
				true
			}
		}
		else if(containsPoint(vert)) false
		else {

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
						val v2 = verts(nearest.baseIdx % curSize)
						val ortho1 = orthoNormVector(vert, v1)
						val ortho2 = orthoNormVector(v1, v2)
						val nanoShifted = v1 + (ortho1 + ortho2) * conf.epsilon
						verts.insertAll(nearest.baseIdx, Iterable(vert, nanoShifted))
						nearests.insertAll(nearest.baseIdx, Iterable(vert, nanoShifted))

					case SecondVertice =>
						val v2 = nearest.point
						val v1 = verts(nearest.baseIdx - 1)
						val ortho1 = orthoNormVector(v1, v2)
						val ortho2 = orthoNormVector(v2, vert)
						val nanoShifted = v2 + (ortho1 + ortho2) * conf.epsilon
						verts.insertAll(nearest.baseIdx, Iterable(nanoShifted, vert))
						nearests.insertAll(nearest.baseIdx, Iterable(nanoShifted, vert))

					case InnerPoint =>
						val np = nearest.point
						val v1 = verts(nearest.baseIdx - 1)
						val dir1 = normVector(np, vert)
						val dir2 = normVector(np, v1)
						val shifted1 = np + (dir1 + dir2) * conf.epsilon
						val shifted2 = np + (dir1 - dir2) * conf.epsilon
						verts.insertAll(nearest.baseIdx, Iterable(shifted1, vert, shifted2))
						nearests.insertAll(nearest.baseIdx, Iterable(shifted1, vert, shifted2))
				}
				true
			}
		}
	}

	def area: Double = (verts ++ verts.headOption).sliding(2, 1).foldLeft(0d)((area, edge) => {
		val p0 = edge(0); val p1 = edge(1)
		area + (p0.lon - p1.lon) * (p0.lat + p1.lat)
	}) / 2

	override def toString = verts.mkString("Polygon[", ", ", "]")
}

object EnvelopePolygon{

	class DefaultConfig extends EnvelopePolygonConfig{
		val maxAngleForEdgeRemoval: Double = 0.9 * Math.PI
		val minAngleForSimpleLineLineIntersection: Double = 0.001
		val minSquaredDistanceForNewVertice: Double = 1e-10
		val epsilon: Double = 1e-6
		val convexnessToleranceAngle: Double = 0.01
		val distanceCostFactor: Double = 5
	}

	object defaultConfig extends DefaultConfig

	def defaultEmpty = new EnvelopePolygon(defaultConfig)

	def apply(vertices: IterableOnce[Point])(conf: EnvelopePolygonConfig): EnvelopePolygon = {
		val p = new EnvelopePolygon(conf)
		p.verts ++= vertices
		p.nearests ++= p.verts
		p
	}

	def default(vertices: Point*) = apply(vertices)(defaultConfig)

	def angleDiff(from: Double, to: Double): Double = {
		val diff0 = to - from
		if(diff0 > Math.PI) diff0 - 2 * Math.PI
		else if(diff0 <= - Math.PI) diff0 + 2 * Math.PI
		else diff0
	}

	enum NearestKind:
		case FirstVertice, SecondVertice, InnerPoint

	class NearestOnEdge(val kind: NearestKind, val point: Point, val distSq: Double){
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

	def getGeoFeature(poly: EnvelopePolygon) = Polygon(
		poly.vertices.toIndexedSeq.map(p => Position(lat = p.lat, lon = p.lon, alt = None, label = None)), None
	)
}
