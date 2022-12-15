package se.lu.nateko.cp.data.formats.netcdf.viewing

// Lat and long are not always in the same order but usually lat, lon
// See http://ferret.wrc.noaa.gov/noaa_coop/coop_cdf_profile.html
class VariableSpecification(var dateVariable: String, var latVariable: String, var lonVariable: String, var elevationVariable: String) {
	def getDateVariable: String = dateVariable

	def setDateVariable(dateVariable: String) =
		this.dateVariable = dateVariable

	def getLatVariable: String = latVariable

	def setLatVariable(latVariable: String): Unit =
		this.latVariable = latVariable

	def getLonVariable = lonVariable

	def setLonVariable(lonVariable: String): Unit =
		this.lonVariable = lonVariable

	def setElevationVariable(elevationVariable: String): Unit =
		this.elevationVariable = elevationVariable

	def getElevationVariable: String = elevationVariable;

}
