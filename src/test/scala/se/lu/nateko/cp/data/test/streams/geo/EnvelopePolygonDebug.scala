package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.funsuite.AnyFunSuite

import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point

class EnvelopePolygonDebug extends AnyFunSuite with EnvelopePolygonHelpers{

	ignore("EnvelopePolygon debug"){
		implicit val p = EnvelopePolygon.defaultEmpty
		add(-12.991, 57.665)
		add(-13.005, 57.665)
		add(-13.01001, 57.666)
		add(-13.01199, 57.667)
		add(-13.01199, 57.668)
		add(-13.01199, 57.668)
		add(-13.01199, 57.668)
		add(-13.01199, 57.667)
		add(-13.01099, 57.667)
		add(-13.01001, 57.668)

		val (_, nonRepeatedPointCount) = p.vertices.foldLeft[(Point, Int)]((null, 0)){
			case (acc @ (prev, count), next) =>
				if(next == prev) acc
				else (next, count + 1)
		}
		assert(nonRepeatedPointCount === p.size)

		while{
			printXarr(p.vertices)
			printYarr(p.vertices)
			p.size > 6 && p.reduceVerticesByOne().isRight
		} do ()

		println(p.vertices.indices.map(p.verticeCost))
		println(p.vertices.indices.map(p.edgeCost))
		assert(!p.verticeIsConcave(0))

	}

	ignore("EnvelopePolygon debug 2"){
		implicit val p = EnvelopePolygon.defaultEmpty
		add(51.24807098745052, -20.536151500738157)
		add(109.0683283505391, 34.36887557724276)
		add(-69.56969550016895, -28.094834450311147)
		add(62.07176696517618, -15.082551343775236)


		while{
			printXarr(p.vertices)
			printYarr(p.vertices)
			p.size > 4 && p.reduceVerticesByOne().isRight
		} do ()
		assert(!selfIntersects(p))
	}

	ignore("EnvelopePolygon debug 3"){
		implicit val p = EnvelopePolygon.defaultEmpty
		add(126.78083483632014, -89.7927492841762)
		add(175.8871963966767, -60.46169828056818)
		add(-100.94871632118426, -73.54171609855533)
		add(-165.18184457976855, -39.87243453740618)


		while{
			printXarr(p.vertices)
			printYarr(p.vertices)
			p.size > 4 && p.reduceVerticesByOne().isRight
		} do ()
		assert(!selfIntersects(p))
	}
}
