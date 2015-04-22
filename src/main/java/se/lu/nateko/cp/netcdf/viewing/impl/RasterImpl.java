package se.lu.nateko.cp.netcdf.viewing.impl;

import se.lu.nateko.cp.netcdf.viewing.Raster;
import ucar.ma2.Array;
import ucar.ma2.Index;
import ucar.ma2.Index2D;

public class RasterImpl implements Raster {
	
	private final Array arr;
	private final Index index;
	private final int sizeX, sizeY;
	private final double min, max;
	
	public RasterImpl(Array ucarArr, int sizeX, int sizeY, double min, double max){
		arr = ucarArr;
		index = new Index2D(new int[]{sizeX, sizeY});
		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.min = min;
		this.max = max;
	}

	@Override
	public double get(int x, int y) {
		index.set(x, y);
		return arr.getDouble(index);
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
