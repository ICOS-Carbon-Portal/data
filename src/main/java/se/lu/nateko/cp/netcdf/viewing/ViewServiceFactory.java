package se.lu.nateko.cp.netcdf.viewing;

public interface ViewServiceFactory {

	String[] getNetCdfFiles();
	String[] getAvailableServices();
	NetCdfViewService getService(String serviceName);
}
