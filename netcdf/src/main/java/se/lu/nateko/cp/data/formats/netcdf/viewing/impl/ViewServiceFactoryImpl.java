package se.lu.nateko.cp.data.formats.netcdf.viewing.impl;

import java.util.List;

import se.lu.nateko.cp.data.formats.netcdf.util.NetCdfFiles;
import se.lu.nateko.cp.data.formats.netcdf.viewing.NetCdfViewService;
import se.lu.nateko.cp.data.formats.netcdf.viewing.ViewServiceFactory;


public class ViewServiceFactoryImpl implements ViewServiceFactory{
	
	private String netCdfFolder = "";
	private List<String> dates = null;
	private List<String> lats = null;
	private List<String> longs = null;
	private List<String> elevations = null;

	public ViewServiceFactoryImpl(String netCdfFolder, List<String> dates, List<String> lats, List<String> longs, List<String> elevations) {
		this.netCdfFolder = netCdfFolder;
		this.dates = dates;
		this.lats = lats;
		this.longs = longs;
		this.elevations = elevations;
	}
	
	public String[] getNetCdfFiles() {
		return new NetCdfFiles(netCdfFolder).getNetCdfFiles();
	}
	
	public NetCdfViewService getNetCdfViewService(String fileName){
		return new NetCdfViewServiceImpl(netCdfFolder + fileName, dates, lats, longs, elevations);
	}

}
