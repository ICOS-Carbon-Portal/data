package se.lu.nateko.cp.data.test.streams.geo

import scala.collection.JavaConverters._
import scala.collection.mutable.Buffer

import javafx.application.Application
import javafx.geometry.Pos
import javafx.scene.Scene
import javafx.scene.chart.LineChart
import javafx.scene.chart.NumberAxis
import javafx.scene.chart.XYChart
import javafx.scene.control.Button
import javafx.scene.layout.BorderPane
import javafx.scene.layout.HBox
import javafx.scene.text.Text
import javafx.stage.Stage
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygon
import se.lu.nateko.cp.data.streams.geo.EnvelopePolygonConfig
import se.lu.nateko.cp.data.streams.geo.Point
import javafx.scene.control.TextField

object EnvelopePolygonInteractive{
	def main(args: Array[String]): Unit = {
		Application.launch(classOf[EnvelopePolygonInteractive], args: _*)
	}

	def refreshSeries(series: XYChart.Series[Number, Number], points: Seq[Point]): Unit = {
		val data = series.getData
		data.clear()
		data.addAll(
			points.map{p =>
				new XYChart.Data[Number, Number](p.lon, p.lat)
			}.asJava
		)
	}
}

class EnvelopePolygonInteractive extends Application{
	import EnvelopePolygonInteractive._
	val Budget = 20

	override def start(stage: Stage): Unit = {
		var poly = getFreshPoly
		val gps = Buffer.empty[Point]
		stage.setTitle("Interactive concave hull computation")

		val xAxis = new NumberAxis()
		xAxis.setLabel("Longitude")

		val yAxis = new NumberAxis()
		yAxis.setLabel("Latitude")

		val gpsSeries = new XYChart.Series[Number, Number]()
		gpsSeries.setName("GPS track");

		val hullSeries = new XYChart.Series[Number, Number]()
		hullSeries.setName("Concave hull")

		val lineChart = new LineChart[Number,Number](xAxis, yAxis)
		lineChart.setAxisSortingPolicy(LineChart.SortingPolicy.NONE)
		lineChart.setAnimated(false)
		lineChart.getData.addAll(gpsSeries, hullSeries)
		lineChart.setPrefSize(1800, 900)

		val chartBackground = lineChart.lookup(".chart-plot-background")

		chartBackground.getParent.getChildrenUnmodifiable.forEach{n =>
			if (n != chartBackground && n != xAxis && n != yAxis) {
				n.setMouseTransparent(true);
			}
		}

		val info = new Text()

		val reduceButton = new Button("Reduce")
		reduceButton.setOnAction{_ =>
			val reduction = poly.reduceVerticesByOne(getMaxCost)
			reduction.foreach{cost =>
				println("Reduced with cost " + cost)
			}
			if(reduction.isRight) refreshPlot()
		}

		def refreshPlot(): Unit = {
			refreshSeries(hullSeries, poly.vertices ++ poly.vertices.headOption)
			refreshSeries(gpsSeries, gps)
			reduceButton.setDisable(poly.size < 4)
			info.setText(s"Points in the hull: ${poly.size}, in the track: ${gpsSeries.getData.size}")
		}

		chartBackground.setOnMouseClicked{click =>
			val lon = xAxis.getValueForDisplay(click.getX)
			val lat = yAxis.getValueForDisplay(click.getY)

			val vert = Point(lon.doubleValue, lat.doubleValue)
			poly.addVertice(vert)
			gps += vert
			refreshPlot()
		}

		val autorangeButton = new Button("Autorange")
		autorangeButton.setOnAction{_ =>
			xAxis.setAutoRanging(true)
			xAxis.requestAxisLayout()
			yAxis.setAutoRanging(true)
			yAxis.requestAxisLayout()
			autorangeButton.setDisable(true)
		}

		def initialize(): Unit = {
			poly = getFreshPoly
			gps.clear()
			xAxis.setAutoRanging(false)
			xAxis.setUpperBound(180)
			xAxis.setLowerBound(-180)
			yAxis.setAutoRanging(false)
			yAxis.setUpperBound(90)
			yAxis.setLowerBound(-90)
			autorangeButton.setDisable(false)
			refreshPlot()
		}

		val clearButton = new Button("Clear")
		clearButton.setOnAction{_ => initialize()}

		val buttons = new HBox(10, info, maxCostField, reduceButton, autorangeButton, clearButton)
		buttons.setAlignment(Pos.CENTER)
		buttons.setStyle("-fx-padding: 5 0 0 0")

		val root = new BorderPane()
		root.setCenter(lineChart)
		root.setTop(buttons)
		val scene = new Scene(root)
		scene.getStylesheets.add(getClass.getResource("/geoChartStyle.css").toExternalForm)

		initialize()

		//poly = EnvelopePolygonRun.hull(EnvelopePolygonRun.latLongs)
		//refreshPlot()
		//println(poly)

		stage.setScene(scene)
		stage.show()
	}

	private val maxCostField = new TextField
	maxCostField.setPrefColumnCount(5)

	private def getMaxCost: Double = {
		try{
			val num = maxCostField.getText.toDouble
			if(num <= 0) Double.MaxValue else num
		} catch{
			case _: Throwable => Double.MaxValue
		}
	}

	private def getFreshPoly = EnvelopePolygon(Nil)(new EnvelopePolygon.DefaultConfig{
		override val minSquaredDistanceForNewVertice: Double = 4.01
		override val epsilon: Double = 1
		override val convexnessToleranceAngle: Double = 0.05
	})
}
