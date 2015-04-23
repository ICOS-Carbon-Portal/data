package se.lu.nateko.cp.netcdf.viewing.impl;

import se.lu.nateko.cp.netcdf.viewing.Raster;
import ucar.ma2.Array;

public class RasterImpl implements Raster {
	
	private final Array arr;
	private final int sizeLon, sizeLat;
	private final double min, max;
	private final boolean latFirst;
	
	public RasterImpl(Array ucarArr, int sizeLon, int sizeLat, double min, double max, boolean latFirst){
		arr = ucarArr;
		this.sizeLon = sizeLon;
		this.sizeLat = sizeLat;
		this.min = min;
		this.max = max;
		this.latFirst = latFirst;
	}

	@Override
	public double get(int lon, int lat) {
		int i = latFirst
			? lat * sizeLon + lon
			: lon * sizeLat + lat;
		return arr.getDouble(i);
	}

	@Override
	public int getSizeLon() {
		return sizeLon;
	}

	@Override
	public int getSizeLat() {
		return sizeLat;
	}

	@Override
	public double getMin() {
		return min;
	}

	@Override
	public double getMax() {
		return max;
	}

}
