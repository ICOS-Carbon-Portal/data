package se.lu.nateko.cp.data.test.streams.geo

import java.io.File

import scala.collection.JavaConverters._
import scala.io.Source

import javafx.application.Application
import javafx.scene.Scene
import javafx.scene.chart.LineChart
import javafx.scene.chart.NumberAxis
import javafx.scene.chart.XYChart
import javafx.stage.Stage
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.Point

object EnvelopePolygonRun{
	def main(args: Array[String]): Unit = {
		Application.launch(classOf[EnvelopePolygonRun], args: _*)
	}
}

class EnvelopePolygonRun extends Application{
	val Budget = 20
	val InputLimit = 6000
	val filePath = System.getProperty("user.home") + "/Downloads/58GS20040825_CO2_underway_SOCATv3.tab"

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

		val gpsSeries = new XYChart.Series[Number, Number]();
		gpsSeries.setName("GPS track");

		val gpsData = latLongs
		val hullData = hull(gpsData).vertices

		gpsSeries.getData().addAll(gpsData.map{p =>
			new XYChart.Data[Number, Number](p.lon, p.lat)
		}.asJava)

		val hullSeries = new XYChart.Series[Number, Number]();
		hullSeries.setName("Concave hull");

		hullSeries.getData().addAll((hullData :+ hullData.head).map{p =>
			new XYChart.Data[Number, Number](p.lon, p.lat)
		}.asJava)

		lineChart.getData().addAll(gpsSeries, hullSeries);

		val scene  = new Scene(lineChart,1000,1000);
		scene.getStylesheets.add(getClass.getResource("/geoChartStyle.css").toExternalForm)
		stage.setScene(scene);
		stage.show()
	}

	def latLongs: IndexedSeq[Point] = Source.fromFile(new File(filePath)).getLines()
		.drop(34)
		.take(InputLimit)
		.map(s => s.split('\t'))
		.map(arr => Point(arr(2).toDouble, arr(1).toDouble))
		.toIndexedSeq

	def hull(latLongs: IndexedSeq[Point]): EnvelopePolygon = {
		val t0 = System.currentTimeMillis()

		val hull = latLongs.foldLeft(EnvelopePolygon.defaultEmpty){
			case (poly, vertice) =>
				poly.addVertice(vertice)
				while(poly.size > Budget && poly.reduceVerticesByOne()){}
				poly
		}

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
