package se.lu.nateko.cp.data.streams.geo

import PointReducer._
import se.lu.nateko.cp.meta.core.data.GeoTrack
import se.lu.nateko.cp.meta.core.data.Position
import se.lu.nateko.cp.meta.core.data.GeoFeature
import se.lu.nateko.cp.meta.core.data.LatLonBox

class PointReducer(nmax: Int, costFun: CostFunction) {

	assert(nmax >= 4, "Geo point reducer must keep at least 4 points")

	def nextState(state: PointReducerState, lat: Double, lon: Double): PointReducerState = {
		import state._

		def getCost(shortListPos: Int): Double = {
			val idx = shortList(shortListPos)
			if(bbox.hasDefiningPoint(lons(idx), lats(idx))){
				//println(s"protecting point #$idx at $shortListPos (${lons(idx)}, ${lats(idx)}) because of $bbox")
				Double.PositiveInfinity
			} else {
				//println("not vertex")
				Math.abs(costs(idx))
			}
		}

		val idx = lats.length

		//taking care of duplicate points early
		if(idx > 0 && lats(idx - 1) == lat && lons(idx - 1) == lon) return state

		lats += lat
		lons += lon
		bbox.updateWith(lon, lat)

		shortList += idx
		costs += idx -> Double.PositiveInfinity
		inheritedCosts += idx -> 0d

		if(idx > 1) updateCost(shortList.length - 2, 0, state) //just added third (or subsequent) point

		if(shortList.length == nmax + 1){// nmax exceeded, need to remove one

			val removePos = (1 to nmax - 1).minBy(getCost) //the first and the last are protected, anyway
			val removeIdx = shortList.remove(removePos) //shortlist is now back to nmax elems
			val oldCost = costs(removeIdx)

			//println(s"removing point #$removeIdx at $removePos (${lons(removeIdx)}, ${lats(removeIdx)})")

			//removed point's costs are not interesting in the future, saving memory
			costs -= removeIdx; inheritedCosts -= removeIdx

			if(removePos > 1) // third in shortlist, or later
				updateCost(removePos - 1, oldCost, state)

			if(removePos < nmax - 1) // the removed was third from the end in shortlist, or earlier
				updateCost(removePos, oldCost, state)
		}

		state
	}

	private def updateCost(idx: Int, heritageCost: Double, state: PointReducerState): Unit = {
		import state._
		val globalIdx = shortList(idx)
		val newInheritedCost = heritageCost / 2 + inheritedCosts(globalIdx)

		if(heritageCost != 0d)
			inheritedCosts += globalIdx -> newInheritedCost

		costs += globalIdx -> costFun(idx, newInheritedCost, state)
	}
}

object PointReducer {

	type CostFunction = (Int, Double, PointReducerState) => Double

	def fullDistanceSquaredCost(nmax: Int) = new PointReducer(nmax, (idx, _, state) => {
		val idx1 = state.shortList(idx - 1)
		val idx2 = state.shortList(idx + 1)
		segmentDistSquaredSum(idx1, idx2, state)
	})

	private def segmentDistSquaredSum(idx1: Int, idx2: Int, state: PointReducerState): Double = {
		import state.{lats, lons}
		val lon1 = lons(idx1)
		val lon2 = lons(idx2)
		val lat1 = lats(idx1)
		val lat2 = lats(idx2)

		val dist12Sq = p2pDistanceSq(lon1, lat1, lon2, lat2)

		if(dist12Sq == 0d) {
			//start and end points the same, using sum of point-to-point distance squares
			(idx1 + 1 until idx2).map(i =>
				p2pDistanceSq(lon1, lat1, lons(i), lats(i))
			).sum
		} else {
			//start and end points form a line, using sum of point-to-line distance squares
			(idx1 + 1 until idx2).map(i =>
				p2lDistanceSqNom(lon1, lat1, lon2, lat2, lons(i), lats(i))
			).sum / dist12Sq
		}
	}

	private def p2pDistanceSq(x1: Double, y1: Double, x2: Double, y2: Double): Double = {
		val diffx = x1 - x2
		val diffy = y1 - y2
		diffx.toDouble * diffx + diffy * diffy
	}

	private def p2lDistanceSqNom(x1: Double, y1: Double, x2: Double, y2: Double, x0: Double, y0: Double): Double = {
		val distNom = (y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1
		distNom.toDouble * distNom
	}

	def signedTriangleAreaCost(nmax: Int) = new PointReducer(nmax, (idx, heritageCost, state) => {
		val idxs = Array(idx - 1, idx, idx + 1).map(state.shortList)
		val xs = idxs.map(state.lons)
		val ys = idxs.map(state.lats)

		heritageCost + signedTriangleArea(xs(0), ys(0), xs(1), ys(1), xs(2), ys(2))
	})

	private def signedTriangleArea(x1: Double, y1: Double, x2: Double, y2: Double, x3: Double, y3: Double): Double = {
		y1.toDouble * (x2 - x3) + y2 * (x3 - x1) + y3 * (x1 - x2)
	}

	def sigmaError(state: PointReducerState): Float = Math.sqrt(
		state.shortList.sliding(2)
			.map(segm => segmentDistSquaredSum(segm(0), segm(1), state))
			.sum / (state.lons.length - 1)
	).toFloat

	def getCoverage(maxErrorFactor: Double)(state: PointReducerState): Option[GeoTrack] = {
		val err = sigmaError(state)
		import state.bbox
		val bboxSizeEst = Math.sqrt(bbox.width * bbox.height)

		if(err <= maxErrorFactor * bboxSizeEst) Some(GeoTrack(
			state.latLongs.map{
				case (lat, lon) => Position(lat, lon)
			}
		)) else None
	}
}
