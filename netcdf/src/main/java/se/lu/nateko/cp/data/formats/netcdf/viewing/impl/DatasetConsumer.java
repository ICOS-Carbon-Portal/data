package se.lu.nateko.cp.data.formats.netcdf.viewing.impl;

import java.io.IOException;
import ucar.nc2.dataset.NetcdfDataset;
import ucar.ma2.InvalidRangeException;

@FunctionalInterface
public interface DatasetConsumer<R> {
	R apply(NetcdfDataset ds) throws IOException, InvalidRangeException;
}
