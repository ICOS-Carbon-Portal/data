package se.lu.nateko.cp.netcdf.viewing.impl;

import java.io.File;
import java.io.IOException;
import java.util.Calendar;
import java.util.Formatter;
import java.util.Locale;

import se.lu.nateko.cp.netcdf.viewing.*;
import ucar.ma2.Array;
import ucar.ma2.InvalidRangeException;
import ucar.ma2.MAMath;
import ucar.ma2.Section;
import ucar.nc2.Variable;
import ucar.nc2.dataset.CoordinateAxis1DTime;
import ucar.nc2.dataset.NetcdfDataset;
import ucar.nc2.dataset.VariableDS;
import ucar.nc2.time.CalendarDate;

public class NetCdfViewServiceImpl implements NetCdfViewService{

	private final ServiceSpecification spec;
	private final File file;
	
	public NetCdfViewServiceImpl(ServiceSpecification spec){
		this.spec = spec;
		this.file = spec.file;
	}
	
	@Override
	public Calendar[] getAvailableDates() throws IOException {
		NetcdfDataset ds = null;
		
		try {
			ds = NetcdfDataset.openDataset(file.getAbsolutePath());
			
			Variable ncVar = ds.findVariable(spec.dimensions.sliceVariable);
			VariableDS ncVarDS = new VariableDS(null, ncVar, false);
			
			StringBuilder sb = new StringBuilder();
			Formatter formatter = new Formatter(sb, Locale.ENGLISH);
			CoordinateAxis1DTime sliceAxis = CoordinateAxis1DTime.factory(ds, ncVarDS, formatter);
			
			return sliceAxis.getCalendarDates().toArray(new Calendar[0]);
			
		} catch (IOException ioe) {
			throw new IOException("Could not open file " + file.getAbsolutePath());
		}finally{
			if(ds != null) ds.close();
		}
	}

	@Override
	public Raster getRaster(String time) throws IOException, InvalidRangeException {
		NetcdfDataset ds = null;
		
		try {
			ds = NetcdfDataset.openDataset(file.getAbsolutePath());
			
			Variable ncVar = ds.findVariable(spec.varName);
			VariableDS ncVarDS = new VariableDS(null, ncVar, false);
			
			int lonDimInd = ncVar.findDimensionIndex(spec.dimensions.lonDimension);
			int latDimInd = ncVar.findDimensionIndex(spec.dimensions.latDimension);
			
			int sizeX = ncVar.getDimension(lonDimInd).getLength();
			int sizeY = ncVar.getDimension(latDimInd).getLength();
			
			StringBuilder sb = new StringBuilder();
			Formatter formatter = new Formatter(sb, Locale.ENGLISH);
			CoordinateAxis1DTime sliceAxis = CoordinateAxis1DTime.factory(ds, ncVarDS, formatter);
			
			int dateTimeInd = sliceAxis.findTimeIndexFromCalendarDate(CalendarDate.parseISOformat("gregorian", time));
			
			int[] origin = new int[] {dateTimeInd, 0, 0};
			int[] size = new int[] {1, sizeY, sizeX};
			Section sec = new Section(origin, size);
			
			Array arrFullDim = ncVar.read(sec);
			Array arrReduced = arrFullDim.reduce();
			
			double min = MAMath.getMinimum(arrReduced);
			double max = MAMath.getMaximum(arrReduced);
			
			return new RasterImpl(arrReduced, sizeX, sizeY, min, max);
			
		} catch (IOException ioe) {
			throw new IOException("Could not open file " + file.getAbsolutePath());
		} catch (InvalidRangeException e) {
			throw new InvalidRangeException("Invalid range working with file " + file.getAbsolutePath());
		}finally{
			if(ds != null) ds.close();
		}
	}

}
