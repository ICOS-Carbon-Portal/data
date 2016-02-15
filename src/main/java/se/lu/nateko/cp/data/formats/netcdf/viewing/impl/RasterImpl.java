package se.lu.nateko.cp.data.formats.netcdf.viewing.impl;

import se.lu.nateko.cp.data.formats.netcdf.viewing.Raster;
import ucar.ma2.Array;

public class RasterImpl implements Raster {
	
	private final Array arr;
	private final int sizeLon, sizeLat;
	private final double min, max, latMin, latMax, lonMin, lonMax;
	private final boolean latFirst;
	
	public RasterImpl(Array ucarArr, int sizeLon, int sizeLat, double min, double max, boolean latFirst, double latMin, double latMax, double lonMin, double lonMax){
		arr = ucarArr;
		this.sizeLon = sizeLon;
		this.sizeLat = sizeLat;
		this.min = min;
		this.max = max;
		this.latFirst = latFirst;
		this.latMin = latMin;
		this.latMax = latMax;
		this.lonMin = lonMin;
		this.lonMax = lonMax;
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

	@Override
	public double getLatMin() {
		return latMin;
	}
	
	@Override
	public double getLatMax() {
		return latMax;
	}
	
	@Override
	public double getLonMin() {
		return lonMin;
	}
	
	@Override
	public double getLonMax() {
		return lonMax;
	}
}
