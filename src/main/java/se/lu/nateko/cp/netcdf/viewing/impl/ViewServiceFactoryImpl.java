package se.lu.nateko.cp.netcdf.viewing.impl;

import se.lu.nateko.cp.netcdf.util.NetCdfFiles;
import se.lu.nateko.cp.netcdf.viewing.*;


public class ViewServiceFactoryImpl implements ViewServiceFactory{
	
	public String[] getNetCdfFiles() {
		return new NetCdfFiles().getNetCdfFiles();
	}
	
	public NetCdfViewService getNetCdfViewService(String fileName){
		return new NetCdfViewServiceImpl(fileName);
	}

}
