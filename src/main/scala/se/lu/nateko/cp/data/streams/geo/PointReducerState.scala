package se.lu.nateko.cp.data.streams.geo

import scala.collection.mutable.Buffer
import scala.collection.mutable.Map

class PointReducerState(val nmax: Int){

	import PointReducerState._
	assert(nmax >= 2, "Geo point reducer must keep at least 2 points")

	val lats, lons = Buffer.empty[Float]
	val shortList = Buffer.empty[Int]
	var n: Int = 0

	val costs = Map.empty[Int, Double]

	def updateCost(idx: Int): Unit = {
		val globIdx = shortList(idx)
		costs += globIdx -> recomputeCost(idx)
	}

	def recomputeCost(idx: Int): Double = {
		val idx1 = shortList(idx - 1)
		val idx2 = shortList(idx + 1)

		val lon1 = lons(idx1)
		val lon2 = lons(idx2)
		val lat1 = lats(idx1)
		val lat2 = lats(idx2)

		val dist12Sq = {
			val latDiff = lat2 - lat1
			val lonDiff = lon2 - lon1
			latDiff * latDiff + lonDiff * lonDiff
		}

		(idx1 to idx2).map(i =>
			distanceSqNom(lon1, lat1, lon2, lat2, lons(i), lats(i))
		).sum / dist12Sq
	}

	def latLongs = shortList.map(i => (lats(i), lons(i)))
}

object PointReducerState{

	def apply(nmax: Int) = new PointReducerState(nmax)

	def distanceSqNom(x1: Float, y1: Float, x2: Float, y2: Float, x0: Float, y0: Float): Double = {
		val distNom = (y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1
		distNom.toDouble * distNom
	}
}
