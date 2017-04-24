import {getBinRaster, getJson} from 'icos-cp-backend';
import {feature} from 'topojson';

export function getRaster(basicId, search){
	const res = getBinRaster(basicId, '/netcdf/getSlice' + search);
	return res.then(raster => raster);
}

export function getCountriesGeoJson(){
	return getJson('https://static.icos-cp.eu/js/topojson/readme-world.json')
		.then(topo => feature(topo, topo.objects.countries));
}
