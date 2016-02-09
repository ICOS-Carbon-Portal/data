package se.lu.nateko.cp.data.formats.netcdf.viewing;

public interface ViewServiceFactory {
	String[] getNetCdfFiles();
	NetCdfViewService getNetCdfViewService(String fileName);
}
