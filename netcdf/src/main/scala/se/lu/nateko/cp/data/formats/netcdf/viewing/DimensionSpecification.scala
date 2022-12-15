package se.lu.nateko.cp.data.formats.netcdf.viewing

class DimensionSpecification(
	// Lat and long are not always in the same order but usually lat, lon
	// See http://ferret.wrc.noaa.gov/noaa_coop/coop_cdf_profile.html
	var dateDimension: String, var latDimension: String, var lonDimension: String, var elevationDimension: String
) {

	def getDateDimension = dateDimension

	def setDateDimension(dateDimension: String): Unit =
		this.dateDimension = dateDimension

	def getLatDimension = latDimension

	def setLatDimension(latDimension: String): Unit =
		this.latDimension = latDimension

	def getLonDimension = lonDimension

	def setLonDimension(lonDimension: String): Unit =
		this.lonDimension = lonDimension

	def setElevationDimension(elevationDimension: String) =
		this.elevationDimension = elevationDimension

	def getElevationDimension = elevationDimension
}
