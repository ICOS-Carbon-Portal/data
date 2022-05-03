package se.lu.nateko.cp.data.streams.geo

import GeoAlgorithms.side

enum SegmentsIntersection:
	case NoIntersection, SingleVertice, CollinearOverlap, VerticeInside, InnerPoints

object SegmentsIntersection{
	import SegmentsIntersection._

	def forSegments(a: Point, b: Point, c: Point, d: Point): SegmentsIntersection = {
		val acd = side(a, c, d); val bcd = side(b, c, d)
		val cab = side(c, a, b); val dab = side(d, a, b)
		if(acd * bcd == 1 || cab * dab == 1) NoIntersection
		else if(acd * bcd == -1 && cab * dab == -1) InnerPoints
		else if(acd == 0 && bcd == 0){
			val xmin1 = Math.min(a.lon, b.lon)
			val xmax2 = Math.max(c.lon, d.lon)
			val xmax1 = Math.max(a.lon, b.lon)
			val xmin2 = Math.min(c.lon, d.lon)
			val ymin1 = Math.min(a.lat, b.lat)
			val ymax2 = Math.max(c.lat, d.lat)
			val ymax1 = Math.max(a.lat, b.lat)
			val ymin2 = Math.min(c.lat, d.lat)
			if(xmin1 > xmax2 || xmax1 < xmin2 || ymin1 > ymax2 || ymax1 < ymin2) NoIntersection
			else if(
				xmax1 == xmin2 && xmin1 < xmax1 ||
				xmax2 == xmin1 && xmin2 < xmax2 ||
				ymax1 == ymin2 && ymin1 < ymax1 ||
				ymax2 == ymin1 && ymin2 < ymax2
			) SingleVertice
			else CollinearOverlap
		}
		else if(a == c || a == d || b == c || b == d) SingleVertice
		else VerticeInside
	}
}