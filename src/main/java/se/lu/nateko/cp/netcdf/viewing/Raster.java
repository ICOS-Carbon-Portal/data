package se.lu.nateko.cp.netcdf.viewing;

public interface Raster {

	/**
	 * @param lon longitude coordinate index
	 * @param lat latitude coordinate index
	 * @return the value
	 */
	double get(int lon, int lat);
	int getSizeLon();
	int getSizeLat();

	double getMin();
	double getMax();
	double getLatMin();
	double getLatMax();
	double getLonMin();
	double getLonMax();
	
	default double[][] to2DArray(){
		int nx = getSizeLon(), ny = getSizeLat();
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
