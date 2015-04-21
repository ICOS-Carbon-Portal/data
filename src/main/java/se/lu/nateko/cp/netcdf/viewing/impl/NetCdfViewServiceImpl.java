package se.lu.nateko.cp.netcdf.viewing.impl;

import java.io.File;
import java.io.IOException;
import java.util.Formatter;
import java.util.List;
import java.util.Locale;

import se.lu.nateko.cp.netcdf.viewing.*;
import ucar.ma2.Array;
import ucar.nc2.NetcdfFile;
import ucar.nc2.Variable;
import ucar.nc2.dataset.CoordinateAxis;
import ucar.nc2.dataset.CoordinateAxis1D;
import ucar.nc2.dataset.CoordinateAxis1DTime;
import ucar.nc2.dataset.NetcdfDataset;
import ucar.nc2.dataset.VariableDS;
import ucar.nc2.time.CalendarDate;
import ucar.nc2.ReduceReader;

public class NetCdfViewServiceImpl implements NetCdfViewService{

	private final ServiceSpecification spec;
	private final File file;
	
	public NetCdfViewServiceImpl(ServiceSpecification spec){
		this.spec = spec;
		this.file = spec.file;
	}
	
	@Override
	public List<CalendarDate> getAvailableDates() throws IOException {
		NetcdfDataset ds = null;
		
		try {
			ds = NetcdfDataset.openDataset(file.getAbsolutePath());
			
			Variable ncVar = ds.findVariable(spec.dimensions.sliceVariable);
			VariableDS ncVarDS = new VariableDS(null, ncVar, false);
			
			StringBuilder sb = new StringBuilder();
			Formatter formatter = new Formatter(sb, Locale.ENGLISH);
			CoordinateAxis1DTime sliceAxis = CoordinateAxis1DTime.factory(ds, ncVarDS, formatter);
			
			return sliceAxis.getCalendarDates();
			
		} catch (IOException ioe) {
			throw new IOException("Could not open file " + file.getAbsolutePath());
		}finally{
			if(ds != null) ds.close();
		}
	}

	@Override
	public Raster getRaster(String time) throws IOException {
		NetcdfDataset ds = null;
		
		try {
			ds = NetcdfDataset.openDataset(file.getAbsolutePath());
			
			Variable ncVar = ds.findVariable(spec.dimensions.sliceVariable);
			VariableDS ncVarDS = new VariableDS(null, ncVar, false);
			
			StringBuilder sb = new StringBuilder();
			Formatter formatter = new Formatter(sb, Locale.ENGLISH);
			CoordinateAxis1DTime sliceAxis = CoordinateAxis1DTime.factory(ds, ncVarDS, formatter);
			
			
			return new RasterImpl();
			
		} catch (IOException ioe) {
			throw new IOException("Could not open file " + file.getAbsolutePath());
		}finally{
			if(ds != null) ds.close();
		}
	}

}
