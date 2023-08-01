package se.lu.nateko.cp.data.test

import org.locationtech.jts.algorithm.ConvexHull
import org.locationtech.jts.algorithm.Orientation
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.PrecisionModel
import org.locationtech.jts.geom.{Polygon => GtsPolygon}
import se.lu.nateko.cp.meta.core.data.GeoJson
import se.lu.nateko.cp.meta.core.data.Polygon
import se.lu.nateko.cp.meta.core.data.Position
import se.lu.nateko.cp.meta.core.data.JsonSupport.given_RootJsonFormat_GeoFeature

import spray.json.*

import java.nio.file.Files
import java.nio.file.Paths
import java.nio.file.{StandardOpenOption => SOO}
import scala.io.Source
import scala.util.Using
import se.lu.nateko.cp.meta.core.data.GeoFeature

object EtcBIFgeo:
	val ancillDataPath = "/home/oleg/Downloads/ICOSETC_BE-Bra_Ancillary_202307.csv"

	class BIFrec(val variable: String, val value: String)

	val geoFactory = new GeometryFactory(new PrecisionModel(PrecisionModel.FLOATING), 4326)

	def points = Using(Source.fromFile(ancillDataPath)): src =>
		src.getLines.drop(1)
			.map: line =>
					val cols = line.split(',')
					BIFrec(cols(3), cols(4))
			.sliding(2, 1)
			.flatMap: two =>
				two.map(_.variable) match
					case Seq("PLOT_LOCATION_LAT", "PLOT_LOCATION_LONG") => Some(posFromLatLon(two))
					case Seq("TREE_LOCATION_CALC_LAT", "TREE_LOCATION_CALC_LONG") => Some(posFromLatLon(two))
					case _ => None
			.toArray

	def writeGeoJson: Unit =
		val hullGeo = new ConvexHull(points.get, geoFactory).getConvexHull()
		hullGeo match
			case gtsPoly: GtsPolygon =>
				val rightPoly = if Orientation.isCCW(gtsPoly.getCoordinates()) then gtsPoly else gtsPoly.reverse
				val positions = rightPoly.getCoordinates().map: coord =>
					Position.ofLatLon(coord.y, coord.x)
				val poly: GeoFeature = Polygon(positions.toIndexedSeq, None, None)

				//val json = GeoJson.fromFeature(poly).prettyPrint
				val json = poly.toJson.prettyPrint
				Files.writeString(Paths.get(ancillDataPath + ".json"), json, SOO.TRUNCATE_EXISTING, SOO.CREATE)

	def posFromLatLon(latLon: Seq[BIFrec]) = new Coordinate(
		latLon(1).value.toDouble,// lon
		latLon(0).value.toDouble // lat
	)

