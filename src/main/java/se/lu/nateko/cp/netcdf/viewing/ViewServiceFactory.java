package se.lu.nateko.cp.netcdf.viewing;

import java.io.File;
import java.util.Map;

import se.lu.nateko.cp.netcdf.viewing.impl.NetCdfViewServiceImpl;


public class ViewServiceFactory {
	
	private final Map<String, File> fileIdToFile;

	public ViewServiceFactory(Map<String, File> fileIdToFile){
		this.fileIdToFile = fileIdToFile;
	}
	
	public NetCdfViewService getService(ServiceSpecification spec){
		File file = fileIdToFile.get(spec.name);
		return new NetCdfViewServiceImpl(spec, file);
	}
	
	public String[] getAvailableServices(){
		return fileIdToFile.keySet().toArray(new String[fileIdToFile.size()]);
	}

}
