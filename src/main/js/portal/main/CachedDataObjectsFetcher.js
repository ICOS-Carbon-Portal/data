import LinearCache from "./models/LinearCache";
import {fetchFilteredDataObjects, getExtendedDataObjInfo} from "./backend";
import deepEqual from 'deep-equal';
import config from './config';


export class CachedDataObjectsFetcher{
	constructor(fetchLimit){
		this._fetchLimit = fetchLimit;
		this._cacheId = undefined;
		this._linearCache = undefined;
	}

	fetch(options){
		const cacheId = Object.assign({}, options, {paging: null});
		const {offset, limit} = options.paging;

		if(!deepEqual(this._cacheId, cacheId)){
			this._cacheId = cacheId;
			this._linearCache = new LinearCache(
				(offset, limit) => {
					const opts = Object.assign({}, options, {paging:{offset, limit}});
					return fetchFilteredDataObjects(opts).then(_ => _.rows);
				},
				offset,
				this._fetchLimit
			);
		}

		return this._linearCache.fetch(offset, limit).then(rows => {
			return {
				rows,
				cacheSize: this._linearCache.length,
				isDataEndReached: this._linearCache.isDataEndReached
			};
		});
	}
}

export class DataObjectsFetcher{
	fetch(options){
		return fetchFilteredDataObjects(options).then(({rows}) => {
			return {
				rows,
				cacheSize: undefined,
				isDataEndReached: rows.length < config.stepsize
			};
		});
	}
}

export class CachedDataObjectsExtendedFetcher{
	constructor(fetchLimit, dobjsFetcher){
		this._fetchLimit = fetchLimit;
		this._cacheId = undefined;
		this._linearCache = undefined;
		this._dobjsFetcher = dobjsFetcher;
	}

	fetch(options){

		const cacheId = Object.assign({}, options, {paging: null});
		const {offset, limit} = options.paging;

		if (!deepEqual(this._cacheId, cacheId)){

			this._cacheId = cacheId;
			const self = this;

			this._linearCache = new LinearCache(
				(offset, limit) => {
					const opts = Object.assign({}, options, {paging:{offset, limit}});

					return self._dobjsFetcher.fetch(opts).then(({rows}) => {
						const dobjs = rows.map(d => `<${d.dobj}>`);
						return getExtendedDataObjInfo(dobjs);
					});
				},
				offset,
				this._fetchLimit
			);
		}

		return this._linearCache.fetch(offset, limit);
	}
}

export class DataObjectsExtendedFetcher{
	fetch(dobjs){
		return getExtendedDataObjInfo(dobjs);
	}
}
