import { sparql, getJson, checkStatus, getUrlQuery, BinRaster} from 'icos-cp-backend';
import {feature} from 'topojson';
import {objectSpecification} from './sparqlQueries';
import config from '../../common/main/config';
import { TimeserieParams } from './models/State';
import { DataObject } from '../../common/main/metacore';

export type RasterId = string

export function getRaster(
	id: RasterId, service: string, variable: string, dateIdx: number, elevationIdx?: number
): Promise<BinRaster> {

	const queryParts = new Array<[string, string]>(
		['service', service],
		['varName', variable],
		['dateInd', dateIdx.toString()]
	)
	if (elevationIdx !== undefined){
		queryParts.push(['elevationInd', elevationIdx.toString()])
	}
	return fetch(
			'/netcdf/getSlice' + getUrlQuery(queryParts),
			{
				headers: {'Accept': 'application/octet-stream'}
			}
		)
		.then(checkStatus)
		.then(response => response.arrayBuffer())
		.then(response => {
			return new BinRaster(response, id)
		})
}

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

	return sparql(query, config.sparqlEndpoint, true)
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
	return getJson(`https://meta.icos-cp.eu/objects/${objId}?format=json`);
};
