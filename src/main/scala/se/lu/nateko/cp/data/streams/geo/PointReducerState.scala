package se.lu.nateko.cp.data.streams.geo

import scala.collection.mutable.Buffer
import scala.collection.mutable.Map

class PointReducerState{

	val lats, lons = Buffer.empty[Double]
	val bbox = new BBox
	val shortList = Buffer.empty[Int]

	val costs = Map.empty[Int, Double]
	val inheritedCosts = Map.empty[Int, Double]

	def latLongs = shortList.map(i => (lats(i), lons(i)))
}
