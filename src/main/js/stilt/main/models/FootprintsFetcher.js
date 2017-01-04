import {getRaster} from '../backend';
import {ensureDelay, retryPromise} from 'icos-cp-utils';
import config from '../config';

const defaultCacheSize = 5;

export default class FootprintsFetcher{
	constructor(registry, stationId, options){
		this._registry = registry;
		this._stationId = stationId;
		this._options = Object.assign({
			cacheSize: defaultCacheSize,
			delay: config.defaultDelay,
			indexRange: registry.indexRange()
		}, options);
		this._cache = {};
		this._lastFetched = Date.now();
	}

	withDateRange(dateRange){
		return this.clone({indexRange: this._registry.indexRange(dateRange)});
	}

	withDelay(delay){
		return this.clone({delay});
	}

	clone(optionsUpdate){
		const clone = new FootprintsFetcher(this._registry);
		Object.assign(clone, this);
		clone._cache = Object.assign({}, this._cache);
		clone._options = Object.assign({}, this._options, optionsUpdate);
		return clone;
	}

	get delay(){
		return this._options.delay;
	}

	fetchPlainly(footprint){
		return retryPromise(getRaster.bind(null, this._stationId, footprint.filename), 5);
	}

	fetch(footprint){
		const self = this;
		const cache = this._cache;

		const indices = this.indicesForCaching(footprint.index);

		indices.forEach(idx => {
			if(!cache[idx]) cache[idx] = self.fetchPlainly(self._registry.getFootprint(idx));
		});

		const idxSet = new Set(indices);
		Object.keys(cache).forEach(idx => {
			if(!idxSet.has(parseInt(idx))) delete cache[idx];
		});

		const delay = this._lastFetched - Date.now() + this._options.delay;
		const res = ensureDelay(cache[footprint.index], delay);
		res.then(() => self._lastFetched = Date.now());
		return res;
	}

	indicesForCaching(mainIdx){
		const highPrioFetch = [mainIdx, mainIdx + 1, mainIdx - 1];

		const cacheSize = this._options.cacheSize;
		const lowPrioFetch = cacheSize > 3
			? Array.from({length: cacheSize - 3}).map((_, i) => mainIdx + i + 2)
			: [];

		return highPrioFetch.concat(lowPrioFetch).map(this.indexLooper);
	}

	get indexLooper(){
		const [idxMin, idxMax] = this._options.indexRange;
		const idxDiff = idxMax - idxMin + 1;

		return function(idx){
			var step = idx - idxMin;
			while(step < 0) step += idxDiff;
			return idxMin + step % idxDiff;
		}
	}

	step(startFootprint, indexIncrement){
		const next = this.indexLooper(startFootprint.index + indexIncrement);
		return this._registry.getFootprint(next);
	}

}

