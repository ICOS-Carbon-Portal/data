package se.lu.nateko.cp.data.test.streams.geo

import java.io.File

import scala.io.Source

import javafx.application.Application
import javafx.scene.Scene
import javafx.scene.chart.LineChart
import javafx.scene.chart.NumberAxis
import javafx.scene.chart.XYChart
import javafx.stage.Stage
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.PriorCostFraction
import se.lu.nateko.cp.data.streams.geo.DummyCostStats
import se.lu.nateko.cp.data.streams.geo.Point
import org.gillius.jfxutils.chart.JFXChartUtil
import org.gillius.jfxutils.chart.ChartPanManager

object EnvelopePolygonRun{
	val Budget = 20
	val InputSkip = 0
	val InputLimit = 60000
	val BatchSize = 10
	//val InputLimit = 60000 //interesting value, gives buggy behaviour
	val filePath = System.getProperty("user.home") + "/Downloads/58GS20040825_CO2_underway_SOCATv3.tab"

	def main(args: Array[String]): Unit = {
		Application.launch(classOf[EnvelopePolygonRun], args: _*)
	}

	def latLongs: IndexedSeq[Point] = Source.fromFile(new File(filePath)).getLines()
		.drop(34 + InputSkip)
		.take(InputLimit)
		.map(s => s.split('\t'))
		.map(arr => Point(arr(2).toDouble, arr(1).toDouble))
		.toIndexedSeq

	def hull(latLongs: IndexedSeq[Point]): EnvelopePolygon = {
		val t0 = System.currentTimeMillis()

		//val stats = DummyCostStats
		val stats = new PriorCostFraction(0.01, 100)

		val hull = latLongs.sliding(BatchSize, BatchSize).foldLeft(EnvelopePolygon.defaultEmpty){
			case (poly, vertices) =>
				vertices.foreach(poly.addVertice)

				var reducible = true

				while(poly.size > Budget && reducible){
					val reduction = poly.reduceVerticesByOne(stats.recommendedCostLimit)
					reducible = reduction.isRight
					//stats.addCost(reduction.fold(identity, identity))
					reduction.foreach(stats.addCost)
				}
				poly
		}

		while(hull.size > Budget && hull.reduceVerticesByOne().isRight){}
//		println(s"Last added point was #$nlast ${latLongs(nlast)}")
		println("Final area: " + hull.area)

		val elapsed = System.currentTimeMillis() - t0

		println(s"Elapsed $elapsed milliseconds on hull calculation, now plotting with JavaFX...")
/*
		val pw = new PrintWriter(new File(s"$filePath.reduced.csv"))
		pw.println("Latitude,Longitude")

		hull.vertices.foreach{
			case Point(lon, lat) =>
				pw.println(s"$lat,$lon")
		}
		pw.close()
*/
		hull
	}
}

class EnvelopePolygonRun extends Application{
	import EnvelopePolygonRun._

	override def start(stage: Stage): Unit = {
		stage.setTitle("GPS track vs concave hull")
		val xAxis = new NumberAxis()
		xAxis.setLabel("Longitude")
		xAxis.setForceZeroInRange(false)
		val yAxis = new NumberAxis()
		yAxis.setLabel("Latitude")
		yAxis.setForceZeroInRange(false)
		val lineChart = new LineChart[Number,Number](xAxis,yAxis)
		lineChart.setAxisSortingPolicy(LineChart.SortingPolicy.NONE)

		val gpsData = latLongs
		val hullData = hull(gpsData).vertices

		val gpsSeries = new XYChart.Series[Number, Number]();
		gpsSeries.setName("GPS track");

		val hullSeries = new XYChart.Series[Number, Number]();
		hullSeries.setName("Concave hull");

		lineChart.getData().addAll(gpsSeries, hullSeries);
		val zoomableChart = JFXChartUtil.setupZooming(lineChart, _.consume)
		val panManager = new ChartPanManager(lineChart)
		panManager.start()

		val scene = new Scene(zoomableChart, 1800, 900);
		scene.getStylesheets.add(getClass.getResource("/geoChartStyle.css").toExternalForm)
		stage.setScene(scene);

		EnvelopePolygonInteractive.refreshSeries(hullSeries, hullData :+ hullData.head)
		EnvelopePolygonInteractive.refreshSeries(gpsSeries, gpsData)

		stage.show()
	}
}
