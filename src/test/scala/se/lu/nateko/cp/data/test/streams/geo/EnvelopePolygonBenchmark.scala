package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSuite
import scala.io.Source
import java.io.File
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point
import java.io.PrintWriter

class EnvelopePolygonBenchmark extends FunSuite{

	val Budget = 20
	val filePath = "/home/oleg/Downloads/58GS20040825_CO2_underway_SOCATv3"
	//val filePath = "/home/oleg/Downloads/06AQ20120411_CO2_underway_SOCATv3"

	test("EnvelopePolygon benchmark"){
		val latLongs = Source.fromFile(new File(filePath + ".csv")).getLines().drop(1)
			//.take(20)
			.map(s => s.split(','))
			.map(arr => (arr(0).toFloat, arr(1).toFloat))
			.toIndexedSeq

		val t0 = System.currentTimeMillis()

		val hull = latLongs.foldLeft(new EnvelopePolygon){
			case (poly, (lat, lon)) =>
				poly.addVertice(Point(lon, lat))
				while(poly.size > Budget) poly.reduceVerticesByOne
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
}
