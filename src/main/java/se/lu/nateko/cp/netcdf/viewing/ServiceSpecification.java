package se.lu.nateko.cp.netcdf.viewing;

public class ServiceSpecification {

	public final String name;
	public final String varName;
	public final DimensionsSpecification dimensions;
	
	public ServiceSpecification(String name, String varName, DimensionsSpecification dimensions){
		this.name = name;
		this.varName = varName;
		this.dimensions = dimensions;
	}
	
}
