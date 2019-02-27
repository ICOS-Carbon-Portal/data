import {sparql, getBinRaster, getJson, BinTable} from 'icos-cp-backend';
import {feature} from 'topojson';
import {objectSpecification} from './sparqlQueries';
import config from '../../common/main/config';

// export function getRaster(basicId, search){
// 	console.log({basicId, search});
// 	const res = getBinRaster(basicId, '/netcdf/getSlice' + search);
// 	return res.then(raster => raster);
// }

export const getRaster = (service, variable, date, elevation, gamma) => {
	const basicIdRaster = getBinRaster(null, '/netcdf/getSlice', ['service', service], ['varName', variable], ['date', date], ['elevation', elevation]);
	return basicIdRaster.then(raster => {
		raster.basicId = raster.id;
		raster.id = raster.basicId + gamma;
		return raster;
	});
};

export const getCountriesGeoJson = () => {
	return getJson('https://static.icos-cp.eu/js/topojson/readme-world.json')
		.then(topo => feature(topo, topo.objects.countries));
};

export const getVariablesAndDates = service => {
	const vars = getJson('/netcdf/listVariables', ['service', service]);
	const dates = getJson('/netcdf/listDates', ['service', service]);
	return Promise.all([vars, dates]).then(([variables, dates]) => {return {variables, dates};});
};

export const getElevations = (service, variable) => {
	return getJson('/netcdf/listElevations', ['service', service], ['varName', variable]);
};

export const getServices = () => {
	return getJson('/netcdf/listNetCdfFiles');
};

export const getTitle = (objId) => {
	const query = objectSpecification(config, objId);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;
				return bindings
					? Promise.resolve(bindings.map(b => b.specLabel.value))
					: Promise.reject(new Error("Could not get dobjs from meta"));
			}
		);
};

export const getTimeserie = ({objId, variable, elevation, x, y}) => {
	return getJson(`/netcdf/getCrossSection?service=${objId}&varName=${variable}&elevation=${elevation}&lonInd=${x}&latInd=${y}`);
};
