import { sparql, getJson, checkStatus, getUrlQuery} from 'icos-cp-backend';
import {feature} from 'topojson';
import {objectSpecification} from './sparqlQueries';
import config from '../../common/main/config';
import { TimeserieParams } from './models/State';
import { DataObject } from '../../common/main/metacore';
import { BinRasterExtended } from './models/BinRasterExtended';

function getBinRaster(url: string, ...keyValues: string[]) {
	const keyValuePairs = keyValues.reduce<string[][]>((acc, value, idx) => {
		if (idx % 2 === 0)
			acc.push(keyValues.slice(idx, idx + 2));
		return acc;
	}, []);

	const fullUrl = url + getUrlQuery(...keyValuePairs);

	return fetch(fullUrl, {
		headers: {
			'Accept': 'application/octet-stream'
		}
	})
		.then(checkStatus)
		.then(response => response.arrayBuffer())
		.then(response => {
			return new BinRasterExtended(response, fullUrl, fullUrl);
		});
}

export const getRaster = (service: string, variable: string, date: string, elevation: string) => {
	return getBinRaster('/netcdf/getSlice', 'service', service, 'varName', variable, 'date', date, 'elevation', elevation);
};

export const getCountriesGeoJson = () => {
	return getJson('https://static.icos-cp.eu/js/topojson/readme-world.json')
		.then(topo => feature(topo, topo.objects.countries));
};

export const getVariablesAndDates = (service: string) => {
	const vars = getJson('/netcdf/listVariables', ['service', service]) as Promise<string[]>;
	const dates = getJson('/netcdf/listDates', ['service', service]) as Promise<string[]>;
	
	return Promise.all([vars, dates]).then(([variables, dates]) => {return {variables, dates};});
};

export const getElevations = (service: string, variable: string): Promise<string[]> => {
	return getJson('/netcdf/listElevations', ['service', service], ['varName', variable]);
};

export const getServices = () => {
	return getJson('/netcdf/listNetCdfFiles');
};

export const getTitle = (objId: string) => {
	const query = objectSpecification(config, objId);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;
				return bindings
					? Promise.resolve(bindings[0].specLabel.value)
					: Promise.reject(new Error("Could not get dobjs from meta"));
			}
		);
};

export const getTimeserie = ({ objId, variable, elevation, x, y }: TimeserieParams): Promise<number[]> => {
	return getJson(`/netcdf/getCrossSection?service=${objId}&varName=${variable}&elevation=${elevation}&lonInd=${x}&latInd=${y}`);
};

export const getMetadata = (objId: string): Promise<DataObject> => {
	return getJson(`https://meta.icos-cp.eu/objects/${objId}`);
};
