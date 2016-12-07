import {getRaster} from '../backend';
import {ensureDelay, retryPromise} from '../../../common/main/general/promiseUtils';

export default class RasterDataFetcher{
	constructor(dataObjectVars, options){
		this._dataObjectVars = dataObjectVars;
		this._options = Object.assign({
			delay: 200,
		}, options);
		this._lastFetched = Date.now();
		this._cache = {};
	}

	withDelay(delay){
		return this.clone({delay});
	}

	clone(optionsUpdate){
		return new RasterDataFetcher(this._dataObjectVars, optionsUpdate);
	}

	get delay(){
		return this._options.delay;
	}

	fetchPlainly(selectedIdxs){
		return retryPromise(getRaster.bind(
			null,
			this._dataObjectVars.services[selectedIdxs.serviceIdx],
			this._dataObjectVars.variables[selectedIdxs.variableIdx],
			this._dataObjectVars.dates[selectedIdxs.dateIdx],
			getElevation(this._dataObjectVars.elevations, selectedIdxs.elevationIdx),
			this._dataObjectVars.gammas[selectedIdxs.gammaIdx]), 5);
	}

	getDesiredId(selectedIdxs){
		const baseURI = '/netcdf/getSlice?';

		return baseURI
			+ 'service=' + encodeURIComponent(this._dataObjectVars.services[selectedIdxs.serviceIdx])
			+ '&varName=' + encodeURIComponent(this._dataObjectVars.variables[selectedIdxs.variableIdx])
			+ '&date=' + encodeURIComponent(this._dataObjectVars.dates[selectedIdxs.dateIdx])
			+ '&elevation=' + getElevation(this._dataObjectVars.elevations, selectedIdxs.elevationIdx)
			+ this._dataObjectVars.gammas[selectedIdxs.gammaIdx];
	}

	fetch(selectedIdxs){
		const self = this;
		this._cache = self.fetchPlainly(selectedIdxs);

		const delay = this._lastFetched - Date.now() + this._options.delay;
		const res = ensureDelay(this._cache, delay);
		res.then(() => self._lastFetched = Date.now());
		return res;
	}

}

function getElevation(elevations, elevationIdx){
	return elevations[elevationIdx] ? elevations[elevationIdx] : null;
}

