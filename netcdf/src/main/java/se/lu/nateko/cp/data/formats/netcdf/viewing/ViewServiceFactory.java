package se.lu.nateko.cp.data.formats.netcdf.viewing;

import java.io.IOException;

public interface ViewServiceFactory {
	String[] getNetCdfFiles();
	NetCdfViewService getNetCdfViewService(String fileName) throws IOException;
}
