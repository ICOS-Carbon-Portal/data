package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSuite
import scala.io.Source
import java.io.File
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point
import java.io.PrintWriter

class EnvelopePolygonBenchmark extends FunSuite{

	val Budget = 30
	val ChunkSize = 1
	val filePath = "/home/oleg/Downloads/58GS20040825_CO2_underway_SOCATv3"
	//val filePath = "/home/oleg/Downloads/06AQ20120411_CO2_underway_SOCATv3"

	test("EnvelopePolygon benchmark"){
		val latLongs = Source.fromFile(new File(filePath + ".csv")).getLines().drop(1)
//			.take(60000)
//			.take(10)
			.map(s => s.split(','))
			.map(arr => Point(arr(1).toDouble, arr(0).toDouble))
			.toIndexedSeq

		val t0 = System.currentTimeMillis()

		val hull = latLongs.sliding(ChunkSize, ChunkSize).foldLeft(new EnvelopePolygon){
			case (poly, chunk) =>
				chunk.foreach(poly.addVertice)
				while(poly.size > Budget && poly.reduceVerticesByOne()){}
				poly
		}

		val elapsed = System.currentTimeMillis() - t0

		println(s"Elapsed $elapsed milliseconds")

		val pw = new PrintWriter(new File(s"$filePath.reduced.csv"))
		pw.println("Latitude,Longitude")

		hull.vertices.foreach{
			case Point(lon, lat) =>
				pw.println(s"$lat,$lon")
		}
		pw.close()
	}

	def add(lon: Double, lat: Double)(implicit poly: EnvelopePolygon): Boolean =
		poly.addVertice(new Point(lon, lat))

	ignore("EnvelopePolygon debug"){
		implicit val p = new EnvelopePolygon
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

		def printarr(axis: String, extr: Point => Double) =
			println(p.vertices.map(extr).mkString(s"$axis${p.size} = [", ", ", "]"))

		do{
			printarr("x", _.lon)
			printarr("y", _.lat)
		}while(p.size > 6 && p.reduceVerticesByOne())

		println(p.vertices.indices.map(p.verticeCost))
		println(p.vertices.indices.map(p.edgeCost))
		assert(!p.verticeIsConcave(0))

	}
}
