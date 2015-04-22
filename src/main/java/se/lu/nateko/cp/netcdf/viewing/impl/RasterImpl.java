package se.lu.nateko.cp.netcdf.viewing.impl;

import se.lu.nateko.cp.netcdf.viewing.Raster;
import ucar.ma2.Array;

public class RasterImpl implements Raster {
	
	private final double arr[][];
	private final int sizeX, sizeY;
	private final double min, max;
	
	public RasterImpl(Array ucarArr, int sizeX, int sizeY, double min, double max){
		this.arr = (double[][]) ucarArr.copyToNDJavaArray();
		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.min = min;
		this.max = max;
	}

	@Override
	public double get(int x, int y) {
		return arr[x][y];
	}

	@Override
	public int getSizeX() {
		return sizeX;
	}

	@Override
	public int getSizeY() {
		return sizeY;
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
