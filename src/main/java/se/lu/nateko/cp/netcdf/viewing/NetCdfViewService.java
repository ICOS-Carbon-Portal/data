package se.lu.nateko.cp.netcdf.viewing;

import java.io.IOException;

public interface NetCdfViewService {

	String[] getAvailableSlices() throws IOException;
	Raster getRaster(String time);
}
