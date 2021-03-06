package se.lu.nateko.cp.data.formats.netcdf.viewing;

public class VariableSpecification {
	public String dateVariable;
	public String latVariable;
	public String lonVariable;
	public String elevationVariable;

	public VariableSpecification() {
		
	}
	
	// Lat and long are not always in the same order but usually lat, lon
	// See http://ferret.wrc.noaa.gov/noaa_coop/coop_cdf_profile.html
	public VariableSpecification(String dateVariable, String lat, String lon, String elevationVariable){
		// Variable name
		this.dateVariable = dateVariable;
		// Variable name
		this.latVariable = lat;
		// Variable name
		this.lonVariable = lon;
		// Variable name
		this.elevationVariable = elevationVariable;
	}

	public String getDateVariable() {
		return dateVariable;
	}

	public void setDateVariable(String dateVariable) {
		this.dateVariable = dateVariable;
	}

	public String getLatVariable() {
		return latVariable;
	}

	public void setLatVariable(String latVariable) {
		this.latVariable = latVariable;
	}

	public String getLonVariable() {
		return lonVariable;
	}

	public void setLonVariable(String lonVariable) {
		this.lonVariable = lonVariable;
	}

	public void setElevationVariable(String elevationVariable){
		this.elevationVariable = elevationVariable;
	}

	public String getElevationVariable() {
		return elevationVariable;
	}
}
