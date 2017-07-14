package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.FunSuite
import scala.io.Source
import java.io.File
import se.lu.nateko.cp.data.streams.geo._
import java.io.PrintWriter

class PointReducerTests extends FunSuite {

	test("PointReducer playground"){
		val folder = "/home/maintenance/workspace/data/src/main/matlab/"
		val csvPath = folder + "data1.csv"

		val latLongs = Source.fromFile(new File(csvPath)).getLines().drop(1)
			.map(s => s.split(',')).map(arr => (arr(0).toFloat, arr(1).toFloat))

		val t0 = System.currentTimeMillis()

		val finState = latLongs.foldLeft(PointReducerState(5)){
			case (state, (lat, lon)) => PointReducer.nextState(state, lat, lon)
		}

		println("Elapsed, ms: " + (System.currentTimeMillis() - t0).toString)

		val pw = new PrintWriter(new File(folder + "data1ScalaOut.csv"))

		finState.latLongs.foreach{
			case (lat, lon) =>
				pw.println(s"$lat,$lon")
		}
		pw.close()
	}
}
