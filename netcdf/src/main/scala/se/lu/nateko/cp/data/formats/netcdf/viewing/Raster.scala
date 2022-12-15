package se.lu.nateko.cp.data.formats.netcdf.viewing

trait Raster {
	/**
	 * @param lon longitude coordinate index
	 * @param lat latitude coordinate index
	 * @return the value
	 */
	
	def get(lon: Int, lat: Int): Double
	def getSizeLon: Int
	def getSizeLat: Int

	def getMin: Double
	def getMax: Double

	def getLatMin: Double
	def getLatMax: Double

	def getLonMin: Double
	def getLonMax: Double

	def to2DArray: Array[Array[Double]] = Array.tabulate(getSizeLat, getSizeLon)((lat, lon) => get(lat, lon))
}
