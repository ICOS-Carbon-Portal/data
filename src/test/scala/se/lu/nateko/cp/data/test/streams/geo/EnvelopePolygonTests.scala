package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSpec
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point

class EnvelopePolygonTests extends FunSpec{

	def add(lon: Float, lat: Float)(implicit poly: EnvelopePolygon): Boolean =
		poly.addVertice(new Point(lon, lat))

	private def triangle = {
		implicit val p = new EnvelopePolygon
		add(0, 0)
		add(1, 0)
		add(1, 1)
		p
	}

	private def linear = {
		implicit val p = new EnvelopePolygon
		add(0,0)
		add(1,0)
		add(2,0)
		p
	}
	private def trapezoid = {
		implicit val p = new EnvelopePolygon
		add(0,0)
		add(1,1)
		add(2,1)
		add(3,0)
		p
	}

	describe("Vertice addition"){
		it("Discards second vertice if it is a duplicate"){
			implicit val p = new EnvelopePolygon
			add(42, 42)
			assert(add(42, 42) == false)
			assert(p.size == 1)
		}

		it("Discards third vertice if it is on the edge"){
			implicit val p = new EnvelopePolygon
			add(0, 0)
			add(1, 0)
			assert(add(0.5f, 0) == false)
			assert(p.size == 2)
		}

		def reducedTriangle = {
			val t = triangle
			t.reduceVerticesByOne
			t
		}

		it("Discards points inside triangle and on its edges and vertices"){
			implicit val t = reducedTriangle
			assert(!add(0.9f,0.5f))
			assert(!add(0,0))
			assert(!add(1,0))
			assert(!add(1,1))
			assert(!add(0.5f,0.5f))
			assert(!add(0.5f,0))
			assert(!add(1, 0.5f))
			assert(t.size == 3)
		}

		it("Adds a point outside a triangle"){
			implicit val t = reducedTriangle
			assert(add(-1,-1))
			assert(t.size == 5)
		}
	}

	describe("Constructing EnvelopePolygon by right-angle-triangle vertice additions"){

		val p = triangle

		it("gives size == 4"){
			assert(p.size == 4)
		}

		it("Short-circuits 4th vertice to 0th"){
			assert(p.vertice(0) eq p.vertice(4)) //same-instance comparison
		}

		it("Results in expected edge orientation"){
			assert(p.edgeAngle(0) === 0)
			assert(p.edgeAngle(1) === Math.PI / 2)
			assert(p.edgeAngle(2) === - Math.PI / 2)
			assert(p.edgeAngle(3) === Math.PI)
			assert(p.edgeAngle(4) === 0)
		}
	}

	describe("Vertice concaveness checking"){

		it("Throws exception on empty polygon"){
			val err = intercept[NoSuchElementException]{
				val p0 = new EnvelopePolygon
				p0.verticeIsConcave(0)
			}
			assert(err.getMessage.contains("no edges"))
		}

		it("Throws exception on single-vertice polygon"){
			val err = intercept[NoSuchElementException]{
				implicit val p1 = new EnvelopePolygon
				add(0,0)
				p1.verticeIsConcave(0)
			}
			assert(err.getMessage.contains("no edges"))
		}

		it("Gives 'false' for both vertices of a two-vertice polygon"){
			implicit val p2 = new EnvelopePolygon
			add(0,0)
			add(1,0)
			assert(!p2.verticeIsConcave(0))
			assert(!p2.verticeIsConcave(1))
		}

		it("Gives expected results on right-angle-triangle vertices"){
			val p = triangle

			assert(!p.verticeIsConcave(0))
			assert(!p.verticeIsConcave(1))
			assert(!p.verticeIsConcave(2))
			assert(p.verticeIsConcave(3))
		}

		it("Returns 'true' on a redundant vertice (a joint of co-aligned edges)"){
			val p = linear
			assert(p.verticeIsConcave(1))
			assert(p.verticeIsConcave(3))
		}
	}

	describe("Vertice cost"){

		it("Is 'infinite' on convex vertices"){
			val p = triangle
			assert(p.verticeCost(0) == Double.MaxValue)
			assert(p.verticeCost(1) == Double.MaxValue)
			assert(p.verticeCost(2) == Double.MaxValue)
		}

		it("Is double triangle area on concave vertices"){
			val p = triangle
			assert(p.verticeCost(3) == 1)
		}

		it("Is zero on redundant vertices"){
			val p = linear
			assert(p.verticeCost(1) == 0)
			assert(p.verticeCost(3) == 0)
		}
	}

	describe("Edge cost"){

		it("Is 'infinite' on non-convex edges"){
			assert(trapezoid.edgeCost(0) == Double.MaxValue)
			assert(trapezoid.edgeCost(1) == Double.MaxValue)
			assert(trapezoid.edgeCost(2) == Double.MaxValue)
			assert(trapezoid.edgeCost(3) == Double.MaxValue)
			assert(trapezoid.edgeCost(5) == Double.MaxValue)
		}

		it("Is double triangle area on convex edges"){
			assert(trapezoid.edgeCost(4) == 0.5)
		}
	}

	describe("Vertice reduction"){

		it("Reduces triangle as expected"){
			val p = triangle
			p.reduceVerticesByOne
			assert(p.vertices.toSet === Set(new Point(1,0), new Point(0,0), new Point(1, 1)))
		}

		it("Reduces trapezoid as expected"){
			val p = trapezoid

			for(_ <- 1 to 3){
				p.reduceVerticesByOne
			}
			assert(p.vertices.toSet === Set(new Point(3,0), new Point(0,0), new Point(1.5f, 1.5f)))
		}

		it("Cleans up redundant vertices as first priority"){
			implicit val p = new EnvelopePolygon
			add(0,0)
			add(1,1)
			add(1.5f, 1) //trapezoid with an extra redundant vertice inside the top edge
			add(2,1)
			add(3,0)
			p.reduceVerticesByOne
			p.reduceVerticesByOne
			assert(trapezoid.vertices === p.vertices)
		}
	}
}
