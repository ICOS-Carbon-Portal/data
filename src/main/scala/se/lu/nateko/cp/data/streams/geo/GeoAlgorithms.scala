package se.lu.nateko.cp.data.streams.geo

object GeoAlgorithms {

	def triangleArea2(a: Point, b: Point, c: Point): Double = Math.abs(
		(a.lon - c.lon) * (b.lat - a.lat) - (a.lon - b.lon) * (c.lat - a.lat)
	)

	def side(a: Point, b: Point, c: Point) = Math.signum(
		(a.lon - c.lon) * (b.lat - a.lat) - (a.lon - b.lon) * (c.lat - a.lat)
	)

	/**
	 * Only to be called with lines that are not close to being parallel
	 */
	def lineLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point = {
		val denom = (p1.lon - p2.lon) * (p3.lat - p4.lat) - (p1.lat - p2.lat) * (p3.lon - p4.lon)

		val xnom = (p1.lon * p2.lat - p1.lat * p2.lon) * (p3.lon - p4.lon) -
			(p1.lon - p2.lon) * (p3.lon * p4.lat - p3.lat * p4.lon)

		val ynom = (p1.lon * p2.lat - p1.lat * p2.lon) * (p3.lat - p4.lat) -
			(p1.lat - p2.lat) * (p3.lon * p4.lat - p3.lat * p4.lon)

		new Point(xnom / denom, ynom / denom)
	}

	def lineLineIntersection(p1: Point, p2: Point, p3: Point, smallerAngle: Double, totalAngle: Double): Point = {
		if(smallerAngle == 0) Point((p2.lon + p3.lon) / 2, (p2.lat + p3.lat) / 2) else {
			val l12 = Math.sqrt(distSq(p1, p2))
			val base = Math.sqrt(distSq(p2, p3))
			val lInter = base / l12 * (Math.sin(smallerAngle) / Math.sin(totalAngle))
			Point(
				p2.lon + lInter * (p2.lon - p1.lon),
				p2.lat + lInter * (p2.lat - p1.lat)
			)
		}
	}

	def distSq(p1: Point, p2: Point): Double = {
		val dx = p1.lon - p2.lon
		val dy = p1.lat - p2.lat
		dx * dx + dy * dy
	}

	def orthoNormVector(p1: Point, p2: Point): GeoVector = {
		val norm = Math.sqrt(distSq(p1, p2))
		new GeoVector((p2.lat - p1.lat) / norm, (p1.lon - p2.lon) / norm)
	}

	def normVector(p1: Point, p2: Point): GeoVector = {
		val norm = Math.sqrt(distSq(p1, p2))
		new GeoVector((p2.lon - p1.lon) / norm, (p2.lat - p1.lat) / norm)
	}

	def nearestPoint(to: Point, among: Point*): Point = among.minBy(distSq(to, _))
	def minDistSq(to: Point, fromAmong: Point*): Double = fromAmong.foldLeft(Double.MaxValue){
		(min, fromP) => Math.min(min, distSq(fromP, to))
	}

	def midPoint(ps: Point*) = Point(ps.map(_.lon).sum / ps.size, ps.map(_.lat).sum / ps.size)
}
