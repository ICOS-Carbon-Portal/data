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
	
	default double[][] to2DArray(){
		int nx = getSizeX(), ny = getSizeY();
		double[][] res = new double[ny][nx];
		for(int j = 0; j < ny; j++){
			double[] row = res[j];
			for(int i = 0; i < nx; i++){
				row[i] = get(i, j);
			}
		}
		return res;
	}

}
