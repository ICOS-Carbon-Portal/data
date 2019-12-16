import LinearCache from "./models/LinearCache";
import {fetchFilteredDataObjects} from "./backend";
import deepEqual from 'deep-equal';
import config from './config';
import {ThenArg} from "./backend/declarations";
import {Options} from "./actions";


type FetchFilteredDataObjects = ThenArg<typeof fetchFilteredDataObjects>;
type Rows = FetchFilteredDataObjects["rows"];
type FetchedDataObjs = Promise<{
	rows: Rows
	cacheSize: number
	isDataEndReached: boolean
}>

export class CachedDataObjectsFetcher{
	private cacheId?: {};
	private linearCache? : LinearCache;

	constructor(public readonly fetchLimit: number){
		this.fetchLimit = fetchLimit;
		this.cacheId = undefined;
		this.linearCache = undefined;
	}

	fetch(options: Options): FetchedDataObjs {
		const cacheId = Object.assign({}, options, {paging: null});
		const {offset, limit}: {offset: number, limit: number} = options.paging;

		if(!deepEqual(this.cacheId, cacheId)){
			this.cacheId = cacheId;
			this.linearCache = new LinearCache(
				(offset: number, limit: number) => {
					const opts = Object.assign({}, options, {paging:{offset, limit}});

					return fetchFilteredDataObjects(opts).then((res: FetchFilteredDataObjects) => res.rows);
				},
				this.fetchLimit,
				offset
			);
		}

		return this.linearCache!.fetch(offset, limit).then((rows: Rows) => ({
			rows,
			cacheSize: this.linearCache!.length,
			isDataEndReached: this.linearCache!.isDataEndReached
		}));
	}
}

export class DataObjectsFetcher{
	fetch(options: Options): FetchedDataObjs {
		return fetchFilteredDataObjects(options).then(({rows}) => {
			return {
				rows,
				cacheSize: 0,
				isDataEndReached: rows.length < config.stepsize
			};
		});
	}
}
