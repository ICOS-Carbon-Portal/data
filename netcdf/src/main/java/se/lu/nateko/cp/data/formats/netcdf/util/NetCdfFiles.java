package se.lu.nateko.cp.data.formats.netcdf.util;

import java.io.File;
import java.util.ArrayList;

public class NetCdfFiles {
	
	private final ArrayList<String> netCdfFiles;

	public NetCdfFiles(String netCdfFolder) {
		netCdfFiles = new ArrayList<String>();
		
		File folder = new File(netCdfFolder);
		if (folder.isDirectory()) {
			for (String file : folder.list()) {
				if (file.endsWith(".nc") && new File(folder + "/" + file).isFile()) {
					netCdfFiles.add(file);
				}
			}
		}
	}
	
	public String[] getNetCdfFiles() {
		return netCdfFiles.toArray(new String[netCdfFiles.size()]);
	}
}
