package se.lu.nateko.cp.netcdf.viewing;

public interface ViewServiceFactory {

	String[] getNetCdfFiles();
	NetCdfViewService getNetCdfViewService(String fileName);
}
