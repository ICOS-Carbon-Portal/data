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

object EnvelopePolygonInteractive{
	def main(args: Array[String]): Unit = {
		Application.launch(classOf[EnvelopePolygonInteractive], args: _*)
	}
}

class EnvelopePolygonInteractive extends Application{
	val Budget = 20

	override def start(stage: Stage): Unit = {
		val poly = EnvelopePolygon.defaultEmpty
		stage.setTitle("Interactive concave hull computation")

		val xAxis = new NumberAxis()
		xAxis.setLabel("Longitude")
		xAxis.setUpperBound(180)
		xAxis.setLowerBound(-180)
		xAxis.setAutoRanging(false)

		val yAxis = new NumberAxis()
		yAxis.setLabel("Latitude")
		yAxis.setUpperBound(90)
		yAxis.setLowerBound(-90)
		yAxis.setAutoRanging(false)

		val gpsSeries = new XYChart.Series[Number, Number]()
		gpsSeries.setName("GPS track");

		val hullSeries = new XYChart.Series[Number, Number]()
		hullSeries.setName("Concave hull")

		val lineChart = new LineChart[Number,Number](xAxis, yAxis)
		lineChart.setAxisSortingPolicy(LineChart.SortingPolicy.NONE)
		lineChart.setAnimated(false)
		lineChart.getData.addAll(gpsSeries, hullSeries)

		lineChart.lookup(".chart-plot-background").setOnMouseClicked{click =>
			val lon = xAxis.getValueForDisplay(click.getX)
			val lat = yAxis.getValueForDisplay(click.getY)

			def appendTo(series: XYChart.Series[Number, Number]) =
				series.getData.add(new XYChart.Data(lon, lat))

			appendTo(gpsSeries)

			var shouldRefresh = false
			val vert = Point(lon.doubleValue, lat.doubleValue)
			shouldRefresh |= poly.addVertice(vert)

			while(poly.size > Budget && poly.reduceVerticesByOne()){
				shouldRefresh = true
			}

			if(shouldRefresh){
				val hullData = hullSeries.getData
				hullData.clear()
				(poly.vertices :+ poly.vertices.head).foreach{p =>
					hullData.add(new XYChart.Data(p.lon, p.lat))
				}
			}
		}

		val scene  = new Scene(lineChart,1800,900);
		scene.getStylesheets.add(getClass.getResource("/geoChartStyle.css").toExternalForm)
		stage.setScene(scene);
		stage.show()
	}
}
