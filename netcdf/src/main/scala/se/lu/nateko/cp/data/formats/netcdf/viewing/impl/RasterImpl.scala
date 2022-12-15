package se.lu.nateko.cp.data.formats.netcdf.viewing.impl
import se.lu.nateko.cp.data.formats.netcdf.viewing.Raster
import ucar.ma2.Array

class RasterImpl(
	private val ucarArr: Array,
	private val sizeLon: Int,
	private val sizeLat: Int,
	private val min: Double,
	private val max: Double,
	private val latFirst: Boolean,
	private val latSorted: Boolean,
	private val latMin: Double,
	private val latMax: Double,
	private val lonMin: Double,
	private val lonMax: Double
) extends Raster {

	override def get(lon: Int, lat: Int) = {
		val lat1 = if latSorted then lat else sizeLat - lat - 1
		val i = if latFirst then lat1 * sizeLon + lon else lon * sizeLat + lat1

		ucarArr.getDouble(i);
	}

	override def getSizeLon: Int = sizeLon
	override def getSizeLat: Int = sizeLat
	override def getMin: Double = min
	override def getMax: Double = max
	override def getLatMin: Double = latMin
	override def getLatMax: Double = latMax
	override def getLonMin: Double = lonMin
	override def getLonMax: Double = lonMax

}
