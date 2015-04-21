package se.lu.nateko.cp.netcdf.viewing;

import java.io.File;

public class ServiceSpecification {

	public final File file;
	public final String varName;
	public final DimensionsSpecification dimensions;
	
	public ServiceSpecification(File file, String varName, DimensionsSpecification dimensions){
		this.file = file;
		this.varName = varName;
		this.dimensions = dimensions;
	}
	
}
