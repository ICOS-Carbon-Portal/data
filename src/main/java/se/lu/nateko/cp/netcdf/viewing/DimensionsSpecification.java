package se.lu.nateko.cp.netcdf.viewing;

public class DimensionsSpecification {

	public final String dateVariable;
	public final String latDimension;
	public final String lonDimension;
	
	// Lat and long are not always in the same order but usually lat, lon
	// See http://ferret.wrc.noaa.gov/noaa_coop/coop_cdf_profile.html
	public DimensionsSpecification(String dateVariable, String lat, String lon){
		// Variable name, not dimension name
		this.dateVariable = dateVariable;
		// Dimension name
		this.latDimension = lat;
		// Dimension name
		this.lonDimension = lon;
	}
}
