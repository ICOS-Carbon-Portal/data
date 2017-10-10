package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSuite
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point

class EnvelopePolygonTests extends FunSuite{

	test("Constructing EnvelopePolygon by 3 'attachments' gives size == 4"){
		val p = new EnvelopePolygon

		p.attachDegenerateVertice(0, new Point(0, 0))
		println(p)
		p.attachDegenerateVertice(0, new Point(1, 0))
		println(p)
		p.attachDegenerateVertice(1, new Point(1, 1))
		println(p)

		assert(p.size === 4)
		assert(p.edgeAngle(0) === 0)
		assert(p.edgeAngle(1) === Math.PI / 2)
		assert(p.edgeAngle(2) === - Math.PI / 2)
		assert(p.edgeAngle(3) === Math.PI)
		assert(p.edgeAngle(4) === 0)
	}
}
