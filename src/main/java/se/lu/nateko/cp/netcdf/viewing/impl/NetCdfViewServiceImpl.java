package se.lu.nateko.cp.netcdf.viewing.impl;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Formatter;
import java.util.List;
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

	private DimensionsSpecification dimensions = new DimensionsSpecification();
	private VariableSpecification variables = new VariableSpecification();
		
	private File file = null;

	public NetCdfViewServiceImpl(String fileName, List<String> dates, List<String> lats, List<String> longs){
		file = new File(fileName);
		NetcdfDataset ds = null;

		try {
			ds = NetcdfDataset.openDataset(file.getAbsolutePath());
			
			if (dates != null) {
				for (String value : dates) {
					if (ds.findVariable(value) != null) {
						variables.setDateVariable(value);
						break;
					}
				}
			} 
			
			if (lats != null) {
				for (String value : lats) {
					if (ds.findVariable(value) != null) {
						variables.setLatVariable(value);
						break;
					}
				}
			}
			
			if (longs != null) {
				for (String value : longs) {
					if (ds.findVariable(value) != null) {
						variables.setLonVariable(value);
						break;
					}
				}
			}
			
			dimensions.setDateDimension(ds.findVariable(variables.getDateVariable()).getDimension(0).getShortName());
			dimensions.setLatDimension(ds.findVariable(variables.getLatVariable()).getDimension(0).getShortName());
			dimensions.setLonDimension(ds.findVariable(variables.getLonVariable()).getDimension(0).getShortName());
			
		} catch (Exception e) {
			
		} finally {
			if(ds != null)
				try {
					ds.close();
				} catch (IOException e) {
					
				}
		}
		
	}

	@Override
	public String[] getAvailableDates() throws IOException {
		NetcdfDataset ds = null;

		try {
			ds = NetcdfDataset.openDataset(file.getAbsolutePath());

			Variable ncVar = ds.findVariable(variables.dateVariable);
			VariableDS ncVarDS = new VariableDS(null, ncVar, false);

			StringBuilder sb = new StringBuilder();
			Formatter formatter = new Formatter(sb, Locale.ENGLISH);
			CoordinateAxis1DTime sliceAxis = CoordinateAxis1DTime.factory(ds, ncVarDS, formatter);

			return sliceAxis.getCalendarDates()
					.stream()
					.map(calendarDate -> calendarDate.toString())
					.toArray(n -> new String[n]); 
		} catch (IOException ioe) {
			throw new IOException("Could not open file " + file.getAbsolutePath());
		}finally{
			if(ds != null) ds.close();
		}
	}
	
	@Override
	public String[] getVariables() throws IOException {
		NetcdfDataset ds = null;

		try {
			ds = NetcdfDataset.openDataset(file.getAbsolutePath());
			
			List<String> varList = new ArrayList<String>();
			
			for (Variable var : ds.getVariables()) {
				
				if (var.getRank() == 3
						&& var.getDimension(0).getShortName().equals(dimensions.getDateDimension())
						&& var.getDimension(1).getShortName().equals(dimensions.getLatDimension())
						&& var.getDimension(2).getShortName().equals(dimensions.getLonDimension())){

					varList.add(var.getShortName());
					
				} else if (var.getRank() == 3
						&& var.getDimension(0).getShortName().equals(dimensions.getDateDimension())
						&& var.getDimension(1).getShortName().equals(dimensions.getLonDimension())
						&& var.getDimension(2).getShortName().equals(dimensions.getLatDimension())){

					varList.add(var.getShortName());
				}
			}
			
			return varList.toArray(new String[varList.size()]);

		} catch (IOException ioe) {
			throw new IOException("Could not open file " + file.getAbsolutePath());
		}finally{
			if(ds != null) ds.close();
		}
	}	
	
	@Override
	public Raster getRaster(String time, String varName) throws IOException, InvalidRangeException {
		NetcdfDataset ds = null;

		try {
			ds = NetcdfDataset.openDataset(file.getAbsolutePath());

			Variable ncVar = ds.findVariable(varName);
			
			int dateDimInd = ncVar.findDimensionIndex(dimensions.getDateDimension());
			int lonDimInd = ncVar.findDimensionIndex(dimensions.getLonDimension());
			int latDimInd = ncVar.findDimensionIndex(dimensions.getLatDimension());
			
			int sizeLon = ncVar.getDimension(lonDimInd).getLength();
			int sizeLat = ncVar.getDimension(latDimInd).getLength();
			boolean latFirst = latDimInd < lonDimInd;

			Variable dateVar = ds.findVariable(variables.dateVariable);
			//TODO What does boolean enhance do
			VariableDS dateVarDS = new VariableDS(null, dateVar, false);
			StringBuilder sb = new StringBuilder();
			Formatter formatter = new Formatter(sb, Locale.ENGLISH);

			CoordinateAxis1DTime sliceAxis = CoordinateAxis1DTime.factory(ds, dateVarDS, formatter);
			CalendarDate date = CalendarDate.parseISOformat("gregorian", time);
			int dateVarInd = sliceAxis.findTimeIndexFromCalendarDate(date);

			int[] origin = new int[ncVar.getRank()];
			origin[dateDimInd] = dateVarInd;
			origin[lonDimInd] = 0;
			origin[latDimInd] = 0;
			
			int[] size = new int[ncVar.getRank()];
			size[dateDimInd] = 1;
			size[lonDimInd] = sizeLon;
			size[latDimInd] = sizeLat;
			
			Section sec = new Section(origin, size);

			Array arrFullDim = ncVar.read(sec);
			double fullMin = MAMath.getMinimum(arrFullDim);
			double fullMax = MAMath.getMaximum(arrFullDim);
			
			//Array arrReduced = arrFullDim.reduce();
			//double min = MAMath.getMinimum(arrReduced);
			//double max = MAMath.getMaximum(arrReduced);
			
			return new RasterImpl(arrFullDim, sizeLon, sizeLat, fullMin, fullMax, latFirst);
			//return new RasterImpl(arrReduced, sizeLon, sizeLat, min, max, latFirst);

		} catch (IOException ioe) {
			throw new IOException("IO error when working with file " + file.getAbsolutePath(), ioe);
		}finally{
			if(ds != null) ds.close();
		}
	}



}
