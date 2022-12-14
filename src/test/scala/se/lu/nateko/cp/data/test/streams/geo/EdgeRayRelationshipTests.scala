package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.streams.geo.EdgeRayRelationship.*
import se.lu.nateko.cp.data.streams.geo.Point

class EdgeRayRelationshipTests extends AnyFunSuite{

	test("Simple ray crossing gives 'Cross'"){
		assert(computeRelationship(Point(0,0), Point(1,1), Point(0, 0.5f)) == Cross)
	}

	test("Strictly too high ray gives 'Miss'"){
		assert(computeRelationship(Point(0,0), Point(1,1), Point(0, 2)) == Miss)
	}

	test("Strictly too low ray gives 'Miss'"){
		assert(computeRelationship(Point(0,0), Point(1,1), Point(-1, -1)) == Miss)
	}

	test("Higher-vertice-crossing ray gives 'Cross'"){
		assert(computeRelationship(Point(0,0), Point(1,1), Point(0, 1)) == Cross)
	}

	test("Lower-vertice-crossing ray gives 'Miss'"){
		assert(computeRelationship(Point(0,0), Point(1,1), Point(-1, 0)) == Miss)
	}

	test("Ray originating from within the edge gives 'Start'"){
		assert(computeRelationship(Point(0,0), Point(1,1), Point(0.6f, 0.6f)) == Start)
	}

	test("Ray originating from within the higher vertice gives 'Start'"){
		assert(computeRelationship(Point(0,0), Point(1,1), Point(1, 1)) == Start)
	}

	test("Ray originating from within the lower vertice gives 'Start'"){
		assert(computeRelationship(Point(0,0), Point(1,1), Point(0, 0)) == Start)
	}

	test("Ray passing through a horizontal edge gives 'Miss'"){
		assert(computeRelationship(Point(0,0), Point(1,0), Point(-1, 0)) == Miss)
	}

	test("Ray missing a horizontal edge gives 'Miss'"){
		assert(computeRelationship(Point(0,0), Point(1,0), Point(-1,1)) == Miss)
	}

	test("Ray originating from within a horizontal edge gives 'Start'"){
		assert(computeRelationship(Point(0,0), Point(1,0), Point(0.5f, 0)) == Start)
	}

	test("Ray originating from the left vertice of a horizontal edge gives 'Start'"){
		assert(computeRelationship(Point(0,0), Point(1,0), Point(0, 0)) == Start)
	}

	test("Ray originating from the right vertice of a horizontal edge gives 'Start'"){
		assert(computeRelationship(Point(0,0), Point(1,0), Point(1, 0)) == Start)
	}
}
