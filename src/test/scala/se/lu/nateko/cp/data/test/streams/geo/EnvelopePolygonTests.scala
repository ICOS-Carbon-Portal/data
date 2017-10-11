package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSpec
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point

class EnvelopePolygonTests extends FunSpec{

	private def triangle = {
		val p = new EnvelopePolygon
		p.attachDegenerateVertice(0, new Point(0, 0))
		p.attachDegenerateVertice(0, new Point(1, 0))
		p.attachDegenerateVertice(1, new Point(1, 1))
		p
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
				val p1 = new EnvelopePolygon
				p1.attachDegenerateVertice(0, new Point(0,0))
				p1.verticeIsConcave(0)
			}
			assert(err.getMessage.contains("no edges"))
		}

		it("Gives 'false' for both vertices of a two-vertice polygon"){
			val p2 = new EnvelopePolygon
			p2.attachDegenerateVertice(0, new Point(0,0))
			p2.attachDegenerateVertice(0, new Point(1,0))
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
	}
}
