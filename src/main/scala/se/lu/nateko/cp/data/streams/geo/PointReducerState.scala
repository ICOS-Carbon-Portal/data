package se.lu.nateko.cp.data.streams.geo

import scala.collection.mutable.Buffer
import scala.collection.mutable.Map

class PointReducerState{

	val lats, lons = Buffer.empty[Float]
	val bbox = new BBox
	val shortList = Buffer.empty[Int]

	val costs = Map.empty[Int, Double]
	val inheritedCosts = Map.empty[Int, Double]

	def latLongs = shortList.map(i => (lats(i), lons(i)))
}

class BBox(var left: Point, var top: Point, var right: Point, var bottom: Point){
	def this() = this(new Point(1000, 0), new Point(0, -1000), new Point(-1000, 0), new Point(0, 1000))

	def updateWith(lon: Float, lat: Float): Unit = {
		if(lon < left.lon) left = new Point(lon, lat)
		if(lon > right.lon) right = new Point(lon, lat)
		if(lat < bottom.lat) bottom = new Point(lon, lat)
		if(lat > top.lat) top = new Point(lon, lat)
	}

	def hasDefiningPoint(lon: Float, lat: Float): Boolean =
		left.sameAs(lon, lat) || top.sameAs(lon, lat) || right.sameAs(lon, lat) || bottom.sameAs(lon, lat)

	def width: Float = right.lon - left.lon
	def height: Float = top.lat - bottom.lat

	override def toString = s"BBox($left, $top, $right, $bottom)"
}

case class Point(lon: Float, lat: Float){

	def sameAs(lon2: Float, lat2: Float): Boolean = lon2 == lon && lat2 == lat

	override def toString = s"($lon, $lat)"
}
