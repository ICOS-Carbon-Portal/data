package se.lu.nateko.cp.data.formats.netcdf

import ucar.ma2
import ucar.unidata.geoloc.LatLonRect

case class BoundingBox(latMin: Double, latMax: Double, lonMin: Double, lonMax: Double)

class Raster(
	ucarArr: ma2.Array,
	val sizeLon: Int,
	val sizeLat: Int,
	val min: Double,
	val max: Double,
	latFirst: Boolean,
	latSorted: Boolean,
	val box: BoundingBox
):

	def get(lon: Int, lat: Int) =
		val lat1 = if latSorted then lat else sizeLat - lat - 1
		val i = if latFirst then lat1 * sizeLon + lon else lon * sizeLat + lat1
		ucarArr.getDouble(i)


	def to2DArray: Array[Array[Double]] = Array.tabulate(sizeLat, sizeLon)((lat, lon) => get(lat, lon))
