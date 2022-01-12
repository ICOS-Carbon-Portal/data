package se.lu.nateko.cp.data.streams.geo

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import se.lu.nateko.cp.data.streams.StatefulInitSink
import se.lu.nateko.cp.meta.core.data.GeoFeature
import se.lu.nateko.cp.meta.core.data.Polygon

object GeoFeaturePointSink {

	val DefaultBudget = 20

	def sink(implicit ctxt: ExecutionContext): Sink[Point, Future[GeoFeature]] = Flow.apply[Point]
		.filter(_.isValid)
		.alsoToMat(trackSink())(Keep.right)
		.toMat(polygonSink()){(trackFut, hullFut) =>
			trackFut.flatMap{trackOpt =>
				trackOpt.map(Future.successful).getOrElse(hullFut)
			}
		}


	private def trackSink(
			budget: Int = DefaultBudget,
			maxErrorFactor: Double = 0.05
	)(implicit ctxt: ExecutionContext): Sink[Point, Future[Option[GeoFeature]]] = StatefulInitSink(() => {

		val seed = new PointReducerState
		val reducer = PointReducer.signedTriangleAreaCost(budget)

		Sink.fold[PointReducerState, Point](seed){(state, point) =>
			reducer.nextState(state, point.lat, point.lon)
		}

	}).mapMaterializedValue(_.flatten.map(PointReducer.getCoverage(maxErrorFactor)))


	private def polygonSink(
			budget: Int = DefaultBudget,
			hardBudget: Int = 100,
			batchSize: Int = 40,
			priorCostFraction: Double = 0.05,
			conf: EnvelopePolygonConfig = EnvelopePolygon.defaultConfig
	)(implicit ctxt: ExecutionContext): Sink[Point, Future[Polygon]] = StatefulInitSink(() => {

		val stats = new PriorCostFraction(priorCostFraction)
		val seed = EnvelopePolygon(Nil)(conf)

		Flow.apply[Point].sliding(batchSize, batchSize).fold(seed){
			(poly, vertices) =>
				vertices.foreach(poly.addVertice)

				var reducible = true

				while(poly.size > budget && reducible){
					val costLimit = if(poly.size > hardBudget) Double.MaxValue else stats.recommendedCostLimit
					val reduction = poly.reduceVerticesByOne(costLimit)
					reducible = reduction.isRight
					reduction.foreach(stats.addCost)
				}
				poly
		}.toMat(Sink.head)(Keep.right)

	}).mapMaterializedValue(_.flatten.map{hull =>

		while(hull.size > budget && hull.reduceVerticesByOne().isRight){}

		EnvelopePolygon.getGeoFeature(hull)
	})

}
