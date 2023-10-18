import { sparql, getJson, checkStatus, getUrlQuery, BinRaster} from 'icos-cp-backend';
import {feature} from 'topojson-client';
import config from '../../common/main/config';
import { TimeserieParams } from './models/State';
import { DataObject } from '../../common/main/metacore';
import {ensureDelay, retryPromise} from 'icos-cp-utils';

export interface RasterRequest{
	service: string
	variable: string
	dateIdx: number
	extraDimIdx: number | null
}

export interface VariableInfo{
	shortName: string
	longName?: string
	extra?: DiscriminatingDimension
}

export interface DiscriminatingDimension{
	name: string
	labels: string[]
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
		this._lastFetched = Date.now() + (delay > 0 ? delay : 0)
		return ensureDelay(plain, delay)
	}

}

export const rasterFetcher = new RasterFetcher(3)

export function getRasterId(req: RasterRequest): string {
	const components: Array<string | number> = [
		'service_', req.service, '_var_', req.variable, '_date_', req.dateIdx
	]
	if(req.extraDimIdx !== null && req.extraDimIdx >= 0){
		components.push('_extraDim_')
		components.push(req.extraDimIdx)
	}
	return components.join("")
}

export const getCountriesGeoJson = () => {
	return getJson('https://static.icos-cp.eu/js/topojson/readme-world.json')
		.then(topo => feature(topo, topo.objects.countries));
};

export function getVariablesAndDates(service: string){
	const vars: Promise<VariableInfo[]> = getJson('/netcdf/listVariables', ['service', service])
	const dates: Promise<string[]> = getJson('/netcdf/listDates', ['service', service])

	return Promise.all([vars, dates]).then(([variables, dates]) => ({variables, dates}))
}

export const getServices = () => {
	return getJson('/netcdf/listNetCdfFiles');
};

export const getTimeserie = ({ objId, variable, extraDimInd, x, y }: TimeserieParams): Promise<number[]> => {
	const extraDim = extraDimInd == null ? "" : `&extraDimInd=${extraDimInd}`
	return getJson(`/netcdf/getCrossSection?service=${objId}&varName=${variable}${extraDim}&lonInd=${x}&latInd=${y}`);
};

export const getMetadata = (objId: string): Promise<DataObject> => {
	//TODO Parametrize the meta URL for different ENVRIes
	return getJson(`https://meta.icos-cp.eu/objects/${objId}?format=json`);
};


function getRaster(req: RasterRequest): Promise<BinRaster> {

	const {service, variable, dateIdx, extraDimIdx} = req

	const queryParts = new Array<[string, string]>(
		['service', service],
		['varName', variable],
		['dateInd', dateIdx.toString()]
	)

	if (extraDimIdx !== null && extraDimIdx >= 0){
		queryParts.push(['extraDimInd', extraDimIdx.toString()])
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
