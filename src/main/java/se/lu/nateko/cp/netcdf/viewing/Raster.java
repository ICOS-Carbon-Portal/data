package se.lu.nateko.cp.netcdf.viewing;

public interface Raster {

	/**
	 * @param x latitude coordinate index
	 * @param y longitude coordinate index
	 * @return the value
	 */
	double get(int x, int y);
	int getSizeX();
	int getSizeY();

	double getMin();
	double getMax();

}
