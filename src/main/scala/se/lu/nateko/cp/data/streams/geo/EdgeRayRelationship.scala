package se.lu.nateko.cp.data.streams.geo

object EdgeRayRelationship extends Enumeration{
	val Miss, Cross, Start = Value

	def computeRelationship(v1: Point, v2: Point, rayStart: Point): Value = {
		val x = rayStart.lon
		val y = rayStart.lat

		val x1 = v1.lon
		val x2 = v2.lon
		val ymin = Math.min(v1.lat, v2.lat)
		val ymax = Math.max(v1.lat, v2.lat)

		if(ymin == ymax){
			if(y != ymin) Miss
			else{
				val xmin = Math.min(x1, x2)
				val xmax = Math.max(x1, x2)
				if(x < xmin | x > xmax) Miss
				else Start
			}
		} else if(y > ymax || y < ymin || x > x1 && x > x2) Miss else{
			val y1 = v1.lat
			val y2 = v2.lat

			val xCross = x1 + (y - y1) / (y2 - y1) * (x2 - x1)

			if(xCross < x) Miss
			else if(xCross == x) Start
			else if(y == ymin) Miss
			else Cross
		}
	}
}
