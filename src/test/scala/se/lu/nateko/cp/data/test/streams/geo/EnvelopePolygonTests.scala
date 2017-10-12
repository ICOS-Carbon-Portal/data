package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSpec
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point

class EnvelopePolygonTests extends FunSpec{

	def add(lon: Float, lat: Float)(implicit poly: EnvelopePolygon): Unit =
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

	describe("Constructing EnvelopePolygon by right-angle-triangle vertice additions"){

		val p = triangle

		it("gives size == 4"){
			assert(p.vertices.size == 4)
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
			implicit val p = trapezoid
			add(1.5f, 1)
			p.reduceVerticesByOne
			p.reduceVerticesByOne
			assert(trapezoid.vertices === p.vertices)
		}
	}
}
