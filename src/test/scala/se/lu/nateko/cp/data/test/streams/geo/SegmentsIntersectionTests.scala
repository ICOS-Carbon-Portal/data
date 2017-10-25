package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSuite
import se.lu.nateko.cp.data.streams.geo.SegmentsIntersection._
import se.lu.nateko.cp.data.streams.geo.Point

class SegmentsIntersectionTests extends FunSuite{

	test("non-intersecting segments are reported as such"){
		assert(forSegments(Point(-1, -1), Point(1, 1), Point(0.1, 0.05), Point(1,0)) === NoIntersection)
	}

	test("non-intersecting collinear segments are reported as such"){
		assert(forSegments(Point(2, 2), Point(3, 3), Point(0, 0), Point(1,1)) === NoIntersection)
	}

	test("intersecting segments are reported as such"){
		assert(forSegments(Point(-1, -1), Point(1, 1), Point(-1, 0), Point(1,0)) === InnerPoints)
	}

	test("single-vertice intersection is detected correctly"){
		assert(forSegments(Point(1, 1), Point(3, 2), Point(0, 0), Point(1,1)) === SingleVertice)
	}

	test("single-vertice intersection for collinear segments is detected correctly"){
		assert(forSegments(Point(1, 1), Point(2, 2), Point(0, 0), Point(1,1)) === SingleVertice)
	}

	test("reordered single-vertice intersection for collinear segments is detected correctly"){
		val res = forSegments(Point(2, 1), Point(3, 0), Point(2, 1), Point(1.5,1.5))
		assert(res === SingleVertice)
	}

	test("collinear overlap is reported as such"){
		assert(forSegments(Point(0, 0), Point(3, 3), Point(2, 2), Point(4,4)) === CollinearOverlap)
	}

	test("single vertice of one segment strictly inside another segment is detected correctly"){
		assert(forSegments(Point(0, 0), Point(2, 2), Point(1, 1), Point(2,0)) === VerticeInside)
	}

	test("returns 'CollinearOverlap' for identical vertices"){
		assert(forSegments(Point(0, 0), Point(3, 2), Point(0, 0), Point(3,2)) === CollinearOverlap)
	}
}
