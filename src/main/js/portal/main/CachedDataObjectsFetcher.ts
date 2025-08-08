import deepEqual from "deep-equal";
import LinearCache from "./models/LinearCache";
import {fetchFilteredDataObjects} from "./backend";
import config from "./config";
import {type AsyncResult} from "./backend/declarations";
import {type QueryParameters} from "./actions/types";


type FetchFilteredDataObjects = AsyncResult<typeof fetchFilteredDataObjects>;
type Rows = FetchFilteredDataObjects["rows"];
type FetchedDataObjs = Promise<{
	rows: Rows
	cacheSize: number
	isDataEndReached: boolean
}>;

export class CachedDataObjectsFetcher {
	private cacheId?: {};
	private linearCache?: LinearCache;

	constructor(public readonly fetchLimit: number) {
		this.fetchLimit = fetchLimit;
		this.cacheId = undefined;
		this.linearCache = undefined;
	}

	async fetch(options: QueryParameters): FetchedDataObjs {
		const cacheId = {...options, paging: null};
		const {offset, limit}: {offset: number, limit: number} = options.paging;

		if (!deepEqual(this.cacheId, cacheId)) {
			this.cacheId = cacheId;
			this.linearCache = new LinearCache(
				async (offset: number, limit: number) => {
					const opts = {...options, paging: {offset, limit}};

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

export class DataObjectsFetcher {
	async fetch(options: QueryParameters): FetchedDataObjs {
		return fetchFilteredDataObjects(options).then(({rows}) => ({
			rows,
			cacheSize: 0,
			isDataEndReached: rows.length < config.stepsize
		}));
	}
}
