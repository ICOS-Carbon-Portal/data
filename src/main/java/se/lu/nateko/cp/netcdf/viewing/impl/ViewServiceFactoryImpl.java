package se.lu.nateko.cp.netcdf.viewing.impl;

import java.util.Map;

import se.lu.nateko.cp.netcdf.viewing.*;


public class ViewServiceFactoryImpl implements ViewServiceFactory{
	
	private final Map<String, ServiceSpecification> nameToSpec;
	
	public String[] getNetCdfFiles() {
		return new NetCdfFiles().getNetCdfFiles();
	}

	public ViewServiceFactoryImpl(Map<String, ServiceSpecification> nameToSpec){
		this.nameToSpec = nameToSpec;
	}
	
	public NetCdfViewService getService(String serviceName){
		return new NetCdfViewServiceImpl(nameToSpec.get(serviceName));
	}
	
	public String[] getAvailableServices(){
		return nameToSpec.keySet().toArray(new String[nameToSpec.size()]);
	}
}
