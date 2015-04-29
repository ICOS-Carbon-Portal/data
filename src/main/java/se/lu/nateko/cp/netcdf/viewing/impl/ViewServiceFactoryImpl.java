package se.lu.nateko.cp.netcdf.viewing.impl;

import java.util.List;

import se.lu.nateko.cp.netcdf.util.NetCdfFiles;
import se.lu.nateko.cp.netcdf.viewing.*;


public class ViewServiceFactoryImpl implements ViewServiceFactory{
	
	private String netCdfFolder = "";
	
	public ViewServiceFactoryImpl(String netCdfFolder) {
		this.netCdfFolder = netCdfFolder;
	}
	
	public String[] getNetCdfFiles() {
		return new NetCdfFiles(netCdfFolder).getNetCdfFiles();
	}
	
	public NetCdfViewService getNetCdfViewService(String fileName){
		return new NetCdfViewServiceImpl(netCdfFolder + fileName);
	}

}
