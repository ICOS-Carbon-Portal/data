package se.lu.nateko.cp.netcdf.viewing;

import java.io.IOException;
import java.util.Calendar;
import java.util.List;

import ucar.ma2.InvalidRangeException;
import ucar.nc2.time.CalendarDate;

public interface NetCdfViewService {

	String[] getAvailableDates() throws IOException;
	String[] getVariables() throws IOException;
	Raster getRaster(String time, String varName) throws IOException, InvalidRangeException;	
}
