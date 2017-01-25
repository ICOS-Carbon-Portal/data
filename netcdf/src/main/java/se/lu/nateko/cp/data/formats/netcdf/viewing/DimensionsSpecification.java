package se.lu.nateko.cp.data.formats.netcdf.viewing;

public class DimensionsSpecification {

	public String dateDimension;
	public String latDimension;
	public String lonDimension;
	public String elevationDimension;

	public DimensionsSpecification() {
		
	}
	
	// Lat and long are not always in the same order but usually lat, lon
	// See http://ferret.wrc.noaa.gov/noaa_coop/coop_cdf_profile.html
	public DimensionsSpecification(String dateDimension, String lat, String lon, String elevationDimension){
		// Dimension name, not dimension name
		this.dateDimension = dateDimension;
		// Dimension name
		this.latDimension = lat;
		// Dimension name
		this.lonDimension = lon;
		// Elevation name
		this.elevationDimension = elevationDimension;
	}

	public String getDateDimension() {
		return dateDimension;
	}

	public void setDateDimension(String dateDimension) {
		this.dateDimension = dateDimension;
	}

	public String getLatDimension() {
		return latDimension;
	}

	public void setLatDimension(String latDimension) {
		this.latDimension = latDimension;
	}

	public String getLonDimension() {
		return lonDimension;
	}

	public void setLonDimension(String lonDimension) {
		this.lonDimension = lonDimension;
	}

	public void setElevationDimension(String elevationDimension){
		this.elevationDimension = elevationDimension;
	}

	public String getElevationDimension() {
		return elevationDimension;
	}
}
