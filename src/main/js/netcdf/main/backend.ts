import { sparql, getJson, checkStatus, getUrlQuery, BinRaster} from 'icos-cp-backend';
import {feature} from 'topojson';
import config from '../../common/main/config';
import { TimeserieParams } from './models/State';
import { DataObject } from '../../common/main/metacore';
import {ensureDelay, retryPromise} from 'icos-cp-utils';

export interface RasterRequest{
	service: string
	variable: string
	dateIdx: number
	elevationIdx: number | null
}
class RasterFetcher {
	private _lastFetched: number;

	constructor(readonly numberOfRetries: number) {
		this._lastFetched = Date.now();
	}

	fetch(request: RasterRequest, withDelay: number = 0): Promise<BinRaster>{
		const plain = retryPromise(() => getRaster(request), this.numberOfRetries)
		if(withDelay <= 0) return plain
		const delay = this._lastFetched - Date.now() + withDelay
		this._lastFetched = Date.now() + delay
		return ensureDelay(plain, delay)
	}

}

export const rasterFetcher = new RasterFetcher(3)

export function getRasterId(req: RasterRequest): string {
	const components: Array<string | number> = [
		'service_', req.service, '_var_', req.variable, '_date_', req.dateIdx
	]
	if(req.elevationIdx !== null && req.elevationIdx >= 0){
		components.push('_elevation_')
		components.push(req.elevationIdx)
	}
	return components.join("")
}

export const getCountriesGeoJson = () => {
	return getJson('https://static.icos-cp.eu/js/topojson/readme-world.json')
		.then(topo => feature(topo, topo.objects.countries));
};

export function getVariablesAndDates(service: string){
	const vars: Promise<string[]> = getJson('/netcdf/listVariables', ['service', service])
	const dates: Promise<string[]> = getJson('/netcdf/listDates', ['service', service])

	return Promise.all([vars, dates]).then(([variables, dates]) => ({variables, dates}))
}

export function getElevations(service: string, variable: string): Promise<number[]>{
	return getJson('/netcdf/listElevations', ['service', service], ['varName', variable]);
}

export const getServices = () => {
	return getJson('/netcdf/listNetCdfFiles');
};

export const getTimeserie = ({ objId, variable, elevation, x, y }: TimeserieParams): Promise<number[]> => {
	return getJson(`/netcdf/getCrossSection?service=${objId}&varName=${variable}&elevation=${elevation}&lonInd=${x}&latInd=${y}`);
};

export const getMetadata = (objId: string): Promise<DataObject> => {
	//TODO Parametrize the meta URL for different ENVRIes
	return getJson(`https://meta.icos-cp.eu/objects/${objId}?format=json`);
};


function getRaster(req: RasterRequest): Promise<BinRaster> {

	const {service, variable, dateIdx, elevationIdx} = req

	const queryParts = new Array<[string, string]>(
		['service', service],
		['varName', variable],
		['dateInd', dateIdx.toString()]
	)

	if (elevationIdx !== null && elevationIdx >= 0){
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
			return new BinRaster(response, getRasterId(req))
		})
}
