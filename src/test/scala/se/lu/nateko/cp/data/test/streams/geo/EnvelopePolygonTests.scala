package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point

import org.scalactic.Tolerance

class EnvelopePolygonTests extends AnyFunSpec with Tolerance with EnvelopePolygonHelpers{

	private def triangle = {
		implicit val p = EnvelopePolygon.defaultEmpty
		add(0, 0)
		add(1, 0)
		add(1, 1)
		p
	}

	private def linear = {
		implicit val p = EnvelopePolygon(Nil)(new EnvelopePolygon.DefaultConfig{
			override val convexnessToleranceAngle = 0
		})
		add(0,0)
		add(1,0)
		add(2,0)
		p
	}
	private def trapezoid = {
		implicit val p = EnvelopePolygon(Nil)(new EnvelopePolygon.DefaultConfig{
			override val distanceCostFactor = 0
		})
		add(0,0)
		add(1,1)
		add(2,1)
		add(3,0)
		p
	}

	describe("Vertice addition"){
		it("Discards second vertice if it is a duplicate"){
			implicit val p = EnvelopePolygon.defaultEmpty
			add(42, 42)
			assert(add(42, 42) == false)
			assert(p.size == 1)
		}

		it("Discards third vertice if it is on the edge"){
			implicit val p = EnvelopePolygon.defaultEmpty
			add(0, 0)
			add(1, 0)
			assert(add(0.5f, 0) == false)
			assert(p.size == 2)
		}

		def reducedTriangle = {
			val t = triangle
			t.reduceVerticesByOne()
			t
		}

		it("Discards points inside triangle and on its edges and vertices"){
			implicit val t = reducedTriangle
			assert(!add(0.9,0.5))
			assert(!add(0,0))
			assert(!add(1,0))
			assert(!add(1,1))
			assert(!add(0.5,0.5))
			assert(!add(0.5,0))
			assert(!add(1, 0.5))
			assert(t.size == 3)
		}

		it("Adds a point outside a triangle"){
			implicit val t = reducedTriangle
			assert(add(-1,-1))
			assert(t.size == 5)
		}

		it("Correctly attaches a point to an edge of a slim triangle"){
			implicit val t = EnvelopePolygon.defaultEmpty
			add(0,0); add(1, 5); add(0, 10);
			t.reduceVerticesByOne()
			//have a simple triangle now, 3 points
			assert(t.size == 3)
			add(-1, 4)
			assert(t.vertices.map(round).toSet == Set(Point(0,0), Point(-1, 4), Point(0, 4), Point(0, 10), Point(1, 5)))
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
			assert(p.edgeAngle(0) === 0d +- 1e-6)
			assert(p.edgeAngle(1) === Math.PI / 2 +- 1e-6)
			assert(p.edgeAngle(2) === - Math.PI / 2 +- 1e-6)
			assert(p.edgeAngle(3) === Math.PI +- 1e-6)
			assert(p.edgeAngle(4) === 0d +- 1e-6)
		}
	}

	describe("Vertice concaveness checking"){

		it("Throws exception on empty polygon"){
			val err = intercept[NoSuchElementException]{
				val p0 = EnvelopePolygon.defaultEmpty
				p0.verticeIsConcave(0)
			}
			assert(err.getMessage.contains("no edges"))
		}

		it("Throws exception on single-vertice polygon"){
			val err = intercept[NoSuchElementException]{
				implicit val p1 = EnvelopePolygon.defaultEmpty
				add(0,0)
				p1.verticeIsConcave(0)
			}
			assert(err.getMessage.contains("no edges"))
		}

		it("Gives 'false' for both vertices of a two-vertice polygon"){
			implicit val p2 = EnvelopePolygon.defaultEmpty
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
			assert(p.verticeIsConcave(3))
		}

		it("Returns 'false' on a microscopically-convex vertice (result of an epsilon-shift)"){
			val p = linear
			assert(!p.verticeIsConcave(1))
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
			assert(p.verticeCost(3) === 0)
		}
	}

	describe("Edge cost"){

		it("Is 'infinite' on non-convex edges"){
			val t = trapezoid
			assert(t.edgeCost(0) == Double.MaxValue)
			assert(t.edgeCost(1) == Double.MaxValue)
			assert(t.edgeCost(2) == Double.MaxValue)
			assert(t.edgeCost(3) == Double.MaxValue)
			assert(t.edgeCost(5) == Double.MaxValue)
		}

		it("Is double triangle area on convex edges"){
			val t = trapezoid
			assert(t.edgeCost(4) == 0.5)
		}

		it("is correctly computed on an edge between vertices approaching 180 degrees"){
			val t = EnvelopePolygon(
				Seq(Point(3, -1e-4), Point(2,0), Point(1,0), Point(0, -1e-4))
			)(new EnvelopePolygon.DefaultConfig{
				override val distanceCostFactor = 0
			})
			assert(t.edgeCost(1) === 5e-5)
		}

		it("is zero for an edge collinear with its neighbours"){
			val l = EnvelopePolygon.default(Point(3, 0), Point(2,0), Point(1,0), Point(0, 0))
			assert(l.edgeCost(1) === 0d)
		}
	}

	describe("Vertice reduction"){

		it("Reduces triangle as expected"){
			val p = triangle
			p.reduceVerticesByOne()
			assert(p.vertices.map(round).toSet === Set(Point(1,0), Point(0,0), Point(1, 1)))
		}

		it("Reduces near-degenerate triangle as expected"){
			val p = linear
			p.reduceVerticesByOne()
			assert(p.vertices.map(round).toSet === Set(Point(0,0), Point(1, 0), Point(2, 0)))
		}

		it("Reduces trapezoid as expected"){
			val p = trapezoid

			for(_ <- 1 to 3){
				p.reduceVerticesByOne()
			}
			assert(p.vertices.toSet === Set(Point(3,0), Point(0,0), Point(1.5, 1.5)))
		}

		it("Cleans up redundant vertices as first priority"){
			//trapezoid with an extra redundant vertice inside the top edge
			val trapezoidPlus = Seq(Point(0,0), Point(1,1), Point(1.5, 1), Point(2,1), Point(3,0))
			val p = EnvelopePolygon.default(trapezoidPlus: _*)
			p.reduceVerticesByOne()
			assert(trapezoidPlus.take(2) ++ trapezoidPlus.drop(3) === p.vertices)
		}

	}

	describe("Point containment check"){

		describe("on a simple right-angle triangle"){
			val tr = EnvelopePolygon.default(Point(0,0), Point(1, 0), Point(1,1))

			it("gives 'false' for a point to the left"){
				assert(!tr.containsPoint(Point(-1, 0.5)))
			}

			it("gives 'false' for a point to the left of the horizontal cathetus"){
				assert(!tr.containsPoint(Point(-0.0000001, 0)))
			}

			it("gives 'false' for a point to the right"){
				assert(!tr.containsPoint(Point(2, 0.5)))
			}

			it("gives 'true' for every vertice"){
				for(vertice <- tr.vertices){
					assert(tr.containsPoint(vertice))
				}
			}

			it("gives 'true' for a point inside but close to the hypotenuse"){
				assert(tr.containsPoint(Point(0.5, 0.499999)))
			}

			it("gives 'false' for a point outside but close to the hypotenuse"){
				assert(!tr.containsPoint(Point(0.5, 0.50000001)))
			}
		}

		describe("on a near-vertically-flat triangle"){
			val tr = EnvelopePolygon.default(Point(0,0), Point(1, -1e-6), Point(2,0))

			it("gives 'true' for a point inside"){
				assert(tr.containsPoint(Point(0.5, -1e-10)))
			}

			it("gives 'false' for a point to the left"){
				assert(!tr.containsPoint(Point(0.5, tr.vertice(1).lat * 0.50000001)))
			}

			it("gives 'false' for a point to the right"){
				assert(!tr.containsPoint(Point(1.5, tr.vertice(1).lat * 0.50000001)))
			}
		}
	}
}
