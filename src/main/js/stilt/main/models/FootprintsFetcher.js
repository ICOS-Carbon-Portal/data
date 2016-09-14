import {getRaster} from '../backend';

const defaultCacheSize = 5;
//const defaultParallelizm = 3;

export default class FootprintsFetcher{
	constructor(registry, stationId, options){
		this._registry = registry;
		this._stationId = stationId;
		this._options = Object.assign({
			cacheSize: defaultCacheSize,
//			parallelizm: defaultParallelizm,
			indexRange: registry.indexRange()
		}, options);
		this._cache = {};
	}

	withDateRange(dateRange){
		const res = new FootprintsFetcher(
			this._registry,
			this._stationId,
			Object.assign({}, this._options, {indexRange: this._registry.indexRange(dateRange)})
		);
		res._cache = Object.assign({}, this._cache);
		return res;
	}

	fetchPlainly(footprint){
		return getRaster(this._stationId, footprint.filename);
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

		return cache[footprint.index];
	}

	indicesForCaching(mainIdx){
		const range = this._options.indexRange;
		const idxDiff = range[1] - range[0] + 1;
		const toRange = idx => range[0] + (idx - range[0] + idxDiff) % idxDiff;

		const highPrioFetch = [mainIdx, mainIdx + 1, mainIdx - 1];
		const cacheSize = this._options.cacheSize;
		const lowPrioFetch = cacheSize > 3
			? Array.from({length: cacheSize - 3}).map((_, i) => mainIdx + i + 2)
			: [];
		return highPrioFetch.concat(lowPrioFetch).map(toRange);
	}
}

