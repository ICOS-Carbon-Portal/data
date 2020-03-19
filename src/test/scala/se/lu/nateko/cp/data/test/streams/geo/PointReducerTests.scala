package se.lu.nateko.cp.data.test.streams.geo

import org.scalatest.funsuite.AnyFunSuite
import scala.io.Source
import java.io.File
import se.lu.nateko.cp.data.streams.geo._
import java.io.PrintWriter

class PointReducerTests extends AnyFunSuite {

	ignore("PointReducer playground"){
		val nmax = 31
		val reducer = PointReducer.fullDistanceSquaredCost(nmax)
		//val reducer = PointReducer.signedTriangleAreaCost(nmax)

		val res = singleRun(reducer, "data2")
		println(res)
	}

	private case class RunResult(elapsedMs: Int, sigma: Float, nPoints: Int)

	private def singleRun(reducer: PointReducer, fileName: String): RunResult = {
		val folder = "/home/maintenance/workspace/data/src/main/matlab/"
		val csvPath = s"$folder$fileName.csv"

		val latLongs = Source.fromFile(new File(csvPath)).getLines().drop(1)
			.map(s => s.split(','))
			.map(arr => (arr(0).toDouble, arr(1).toDouble))
			.toIndexedSeq

		val t0 = System.currentTimeMillis()

		val finState = latLongs.foldLeft(new PointReducerState){
			case (state, (lat, lon)) => reducer.nextState(state, lat, lon)
		}

		val elapsed = System.currentTimeMillis() - t0

		val pw = new PrintWriter(new File(s"$folder$fileName.reduced.csv"))

		finState.latLongs.foreach{
			case (lat, lon) =>
				pw.println(s"$lat,$lon")
		}
		pw.close()
		RunResult(elapsed.toInt, PointReducer.sigmaError(finState), latLongs.length)
	}
}
