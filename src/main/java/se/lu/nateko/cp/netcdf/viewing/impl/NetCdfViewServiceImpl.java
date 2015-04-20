package se.lu.nateko.cp.netcdf.viewing.impl;

import java.io.File;
import java.io.IOException;

import se.lu.nateko.cp.netcdf.viewing.*;
import ucar.ma2.Array;
import ucar.nc2.NetcdfFile;
import ucar.nc2.Variable;

public class NetCdfViewServiceImpl implements NetCdfViewService{

	private final ServiceSpecification spec;
	private final File file;
	
	public NetCdfViewServiceImpl(ServiceSpecification spec, File file){
		this.spec = spec;
		this.file = file;
	}
	
	@Override
	public String[] getAvailableSlices() throws IOException {
		NetcdfFile ncFile = null;
		try {
			ncFile = NetcdfFile.open(file.getAbsolutePath());
			Variable ncVar = ncFile.findVariable(spec.dimensions.sliceVariable);
			Array slices = ncVar.read();
			
			//slices.getDataType().
		} catch (IOException ioe) {
			throw new IOException("Could not open file " + file.getAbsolutePath());
		}finally{
			if(ncFile != null) ncFile.close(); 
		}
		
		return null;
	}

	@Override
	public Raster getRaster(String time) {
		// TODO Auto-generated method stub
		return null;
	}

}
