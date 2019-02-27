package se.lu.nateko.cp.data.formats.netcdf.viewing;

import java.io.IOException;

import ucar.ma2.InvalidRangeException;

public interface NetCdfViewService {

	String[] getAvailableDates()
		throws IOException;

	String[] getAvailableElevations(String varName)
		throws IOException;

	String[] getVariables()
		throws IOException;

	Raster getRaster(String time, String varName, String elevation)
		throws IOException,
		InvalidRangeException;

	public double[] getTemporalCrossSection(String varName, int latInd, int lonInd, String elevation)
		throws IOException,
		InvalidRangeException;

}
