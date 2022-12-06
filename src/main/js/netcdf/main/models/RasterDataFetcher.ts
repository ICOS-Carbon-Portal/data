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
type Options = { delay: number }

export interface RasterRequestIdxs{
	serviceIdx: number
	variableIdx: number
	dateIdx: number
	elevationIdx?: number
}

export function getRasterId(req: RasterRequestIdxs): RasterId {
	const components: Array<string | number> = [
		'service', req.serviceIdx, 'var', req.variableIdx, 'date', req.dateIdx
	]
	if(req.elevationIdx !== undefined){
		components.push('elevation')
		components.push(req.elevationIdx)
	}
	return components.join("")
}

export default class RasterDataFetcher {
	private _dataObjectVars: DataObjectVars;
	private _options: Options;
	private _lastFetched: number;
	private _cache: {};

	constructor(dataObjectVars: DataObjectVars, options?: Options) {
		this._dataObjectVars = dataObjectVars;
		this._options = {...{ delay: 200 }, ...options};
		this._lastFetched = Date.now();
		this._cache = {};
	}

	withDelay(delay: number){
		return this.clone({ ...this._options, ...{ delay } });
	}

	clone(optionsUpdate: { delay: number }){
		return new RasterDataFetcher(this._dataObjectVars, optionsUpdate);
	}

	get delay(){
		return this._options.delay;
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

		const delay = this._lastFetched - Date.now() + this._options.delay;
		const res = ensureDelay(this._cache, delay);
		res.then(() => self._lastFetched = Date.now());
		return res;
	}

}
