package se.lu.nateko.cp.data.streams.geo


class BBox(var left: Point, var top: Point, var right: Point, var bottom: Point){
	def this() = this(new Point(1000, 0), new Point(0, -1000), new Point(-1000, 0), new Point(0, 1000))

	def updateWith(lon: Double, lat: Double): Unit = {
		if(lon < left.lon) left = new Point(lon, lat)
		if(lon > right.lon) right = new Point(lon, lat)
		if(lat < bottom.lat) bottom = new Point(lon, lat)
		if(lat > top.lat) top = new Point(lon, lat)
	}

	def hasDefiningPoint(lon: Double, lat: Double): Boolean =
		left.sameAs(lon, lat) || top.sameAs(lon, lat) || right.sameAs(lon, lat) || bottom.sameAs(lon, lat)

	def width: Double = right.lon - left.lon
	def height: Double = top.lat - bottom.lat

	override def toString = s"BBox($left, $top, $right, $bottom)"
}

case class Point(lon: Double, lat: Double){

	def + (v: GeoVector) = Point(lon + v.dlon, lat + v.dlat)

	def sameAs(lon2: Double, lat2: Double): Boolean = lon2 == lon && lat2 == lat

	override def toString = s"($lon, $lat)"
}

class GeoVector(val dlon: Double, val dlat: Double){
	def + (other: GeoVector) = new GeoVector(dlon + other.dlon, dlat + other.dlat)
	def * (factor: Double) = new GeoVector(dlon * factor, dlat * factor)
}
