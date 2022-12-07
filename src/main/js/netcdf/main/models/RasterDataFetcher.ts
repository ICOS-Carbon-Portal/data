import {getRaster, RasterId} from '../backend';
import {ensureDelay, retryPromise} from 'icos-cp-utils';
import { BinRaster } from 'icos-cp-backend';

type DataObjectVars = {
	dates: string[]
	elevations: number[]
	gammas: number[]
	services: string[]
	variables: string[]
}

export interface RasterRequestIdxs{
	serviceIdx: number
	variableIdx: number
	dateIdx: number
	elevationIdx: number | null
}

export function getRasterId(req: RasterRequestIdxs): RasterId {
	const components: Array<string | number> = [
		'service', req.serviceIdx, 'var', req.variableIdx, 'date', req.dateIdx
	]
	if(req.elevationIdx !== null){
		components.push('elevation')
		components.push(req.elevationIdx)
	}
	return components.join("")
}

export default class RasterDataFetcher {
	private _dataObjectVars: DataObjectVars;
	private _lastFetched: number;
	private _cache: {};

	constructor(dataObjectVars: DataObjectVars, readonly delay: number = 200) {
		this._dataObjectVars = dataObjectVars;
		this._lastFetched = Date.now();
		this._cache = {};
	}

	withDelay(delay: number){
		return new RasterDataFetcher(this._dataObjectVars, delay);
	}

	fetchPlainly(req: RasterRequestIdxs): Promise<BinRaster>{
		const rasterId = getRasterId(req)
		const service = this._dataObjectVars.services[req.serviceIdx]
		const varName = this._dataObjectVars.variables[req.variableIdx]
		return retryPromise(
			() => getRaster(rasterId, service, varName, req.dateIdx, req.elevationIdx),
			5
		)
	}

	fetch(selectedIdxs: RasterRequestIdxs): Promise<BinRaster>{
		const self = this;
		this._cache = self.fetchPlainly(selectedIdxs);

		const delay = this._lastFetched - Date.now() + this.delay;
		const res = ensureDelay(this._cache, delay);
		res.then(() => self._lastFetched = Date.now());
		return res;
	}

}
