import {getRaster} from '../backend';
import {ensureDelay, retryPromise} from 'icos-cp-utils';
import { Obj } from '../../../common/main/types';
import { BinRasterExtended } from './BinRasterExtended';

type DataObjectVars = {
	dates: string[]
	elevations: string[]
	gammas: number[]
	services: string[]
	variables: string[]
}
type Options = { delay: number } & Obj<string | number>

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

	fetchPlainly(selectedIdxs: Obj<number>){
		return retryPromise(getRaster.bind(
			null,
			this._dataObjectVars.services[selectedIdxs.serviceIdx],
			this._dataObjectVars.variables[selectedIdxs.variableIdx],
			this._dataObjectVars.dates[selectedIdxs.dateIdx],
			getElevation(this._dataObjectVars.elevations, selectedIdxs.elevationIdx) ?? ''), 5);
	}

	getDesiredId(selectedIdxs: Obj<number>){
		const baseURI = '/netcdf/getSlice?';

		return baseURI
			+ 'service=' + encodeURIComponent(this._dataObjectVars.services[selectedIdxs.serviceIdx])
			+ '&varName=' + encodeURIComponent(this._dataObjectVars.variables[selectedIdxs.variableIdx])
			+ '&date=' + encodeURIComponent(this._dataObjectVars.dates[selectedIdxs.dateIdx])
			+ '&elevation=' + getElevation(this._dataObjectVars.elevations, selectedIdxs.elevationIdx)
			+ this._dataObjectVars.gammas[selectedIdxs.gammaIdx];
	}

	fetch(selectedIdxs: Obj<number>): Promise<BinRasterExtended>{
		const self = this;
		this._cache = self.fetchPlainly(selectedIdxs);

		const delay = this._lastFetched - Date.now() + this._options.delay;
		const res = ensureDelay(this._cache, delay);
		res.then(() => self._lastFetched = Date.now());
		return res;
	}

}

function getElevation(elevations: string[], elevationIdx: number){
	return elevations[elevationIdx] ? elevations[elevationIdx] : null;
}

