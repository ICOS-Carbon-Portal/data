package se.lu.nateko.cp.data.test.streams.geo

import scala.io.Source
import java.io.PrintWriter
import scala.collection.Seq
import se.lu.nateko.cp.data.streams.geo.DummyCostStats
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point
import se.lu.nateko.cp.data.streams.geo.PriorCostFraction


object EnvelopePolygonParamScans {

	case class DataSample(id: String, latLongs: IndexedSeq[Point], skip: Int, limit: Option[Int])
	case class RunParams(maxAngle: Double, batchSize: Int, maxCostFraction: Double, budget: Int)
	case class RunResult(timeMs: Int, area: Double, nVertices: Int)

	def latLongs(fileName: String, headerLength: Int) = Source.fromFile(new java.io.File(fileName)).getLines()
		.drop(headerLength)
		.map(s => s.split('\t'))
		.map(arr => Point(arr(2).toDouble, arr(1).toDouble))
		.toIndexedSeq

	def run(sample: DataSample, params: RunParams): RunResult = {

		val polyConfig = new EnvelopePolygon.DefaultConfig{
			override val maxAngleForEdgeRemoval: Double = params.maxAngle
		}

		val stats = if(params.maxCostFraction > 0) new PriorCostFraction(params.maxCostFraction, 50) else DummyCostStats

		val t0 = System.currentTimeMillis()

		val hull = sample.latLongs
			.drop(sample.skip)
			.take(sample.limit.getOrElse(Int.MaxValue))
			.sliding(params.batchSize, params.batchSize)
			.foldLeft(EnvelopePolygon(Nil)(polyConfig)){
				case (poly, vertices) =>
					vertices.foreach(poly.addVertice)
	
					var reducible = true
	
					while(poly.size > params.budget && reducible){
						val reduction = poly.reduceVerticesByOne(stats.recommendedCostLimit)
						reducible = reduction.isRight
						reduction.foreach(stats.addCost)
					}
					poly
			}

		while(hull.size > params.budget && hull.reduceVerticesByOne().isRight){}

		val elapsed = System.currentTimeMillis() - t0

		RunResult(elapsed.toInt, hull.area, hull.vertices.size)
	}

	val latLongs58GS = latLongs("58GS20040825_CO2_underway_SOCATv3.tab", 34)
	val latLongs06AQ = latLongs("06AQ20120803_CO2_underway_SOCATv3.tab", 36)
	
	val samples = Seq(
		DataSample("58GS_first6k", latLongs58GS, 0, Some(6000)),
		DataSample("58GS_first60k", latLongs58GS, 0, Some(60000)),
		DataSample("58GS_middle6k", latLongs58GS, 60000, Some(6000)),
		DataSample("06AQ_all", latLongs06AQ, 0, None),
	)

	val maxAngles = (0.1 to 0.9 by 0.1).map(_ * Math.PI)
	val batchSizes = Seq(1, 2, 5, 10, 20, 30 , 40)
	val maxCostFractions = Seq(0, 0.01, 0.02, 0.05, 0.1)
	val budget = 20

	val paramsStream = for(
		maxAngle <- maxAngles;
		batchSize <- batchSizes;
		maxCostFraction <- maxCostFractions
	) yield RunParams(maxAngle, batchSize, maxCostFraction, budget)

	def main(args: Array[String]): Unit = {
		printStatsSummary()
	}

	def performScan(): Unit = {
		val resFile = new java.io.File("results.tsv")
		if(resFile.exists) {
			println("Results file already exists!")
			System.exit(1)
		}
		val writer = new PrintWriter(resFile)

		writer.println("SampleId\tBatchSize\tMaxAngle\tMaxCostFraction\tArea\tTime\tNvertices")

		paramsStream.par.foreach{params =>
			samples.foreach{sample =>
				import sample._
				import params._
				println(s"Starting on $id with $params")
				val res = run(sample, params)
				import res._
				writer.println(s"$id\t$batchSize\t$maxAngle\t$maxCostFraction\t$area\t$timeMs\t$nVertices")
				writer.flush()
			}
		}
		writer.close()
	}

	def printStatsSummary(): Unit = {
		val logEntries = Source.fromFile(new java.io.File("results.tsv"))
			.getLines().drop(1).map{line =>
				val e = line.split("\t")
				(
					e(0),
					RunParams(e(2).toDouble, e(1).toInt, e(3).toDouble, budget),
					RunResult(e(5).toInt, e(4).toDouble, e(6).toInt)
				)
			}.toSeq

		val minAreaRes: Map[String, RunResult] = logEntries.groupBy(_._1).mapValues(_.minBy(_._3.area)._3).toSeq.toMap
		val sampleSizes: Map[String, Int] = samples.map(ds => (ds.id, ds.latLongs.size)).toMap

		val bestParams = logEntries.groupBy(_._2)
			.mapValues{entries =>
				val areaCostFactor = entries.map{t => t._3.area / minAreaRes(t._1).area}.sum / 4
				val timeCostFactor = entries.map{t => t._3.timeMs.toDouble / sampleSizes(t._1)}.sum / 4
				(areaCostFactor, timeCostFactor)
			}
			.toSeq.sortBy(_._2._1).take(5)

		bestParams.foreach{best =>
			println(best)
			logEntries.filter(_._2 == best._1) foreach println
		}
	}
}
