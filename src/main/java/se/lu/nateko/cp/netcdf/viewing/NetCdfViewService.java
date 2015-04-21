package se.lu.nateko.cp.netcdf.viewing;

import java.io.IOException;
import java.util.List;

import ucar.nc2.time.CalendarDate;

public interface NetCdfViewService {

	Raster getRaster(String time) throws IOException;
	List<CalendarDate> getAvailableDates() throws IOException;
}
