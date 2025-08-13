import {type AsyncResult} from "../backend/declarations";
import {type fetchFilteredDataObjects} from "../backend";

type Rows = AsyncResult<typeof fetchFilteredDataObjects>["rows"];
type Fetcher = (offset: number, limit: number) => Promise<Rows>;

export default class LinearCache {
	public cache: Rows = [];
	public isDataEndReached = false;

	constructor(private readonly fetcher: Fetcher, private readonly startLimit: number, public offset: number) {}

	get length() {
		return this.cache.length;
	}

	async fetch(offset: number, limit: number) {
		const fromCache = () => this.cache.slice(offset - this.offset, offset - this.offset + limit);

		const useCache = offset >= this.offset && (this.isDataEndReached || offset + limit <= this.offset + this.length);

		if (useCache) {
			return fromCache();
		}

		const fetchingLimit = Math.max(limit, this.startLimit);

		// Add an extra record to fetchingLimit so we know if we hit the end of data
		return this.fetcher(offset, fetchingLimit + 1).then(arr => {
			this.isDataEndReached = this.isDataEndReached ? true : arr.length < fetchingLimit + 1;
			if (arr.length === fetchingLimit + 1) {
				arr.pop();
			}

			// arr: ----
			// cache: ====
			// overlap: ≡≡≡

			if (this.length === 0 || offset === this.offset + this.length) {
				// ====----
				this.cache = [...this.cache, ...arr];
			} else if (offset > this.offset && offset < this.offset + this.length) {
				// ==≡≡--
				this.cache = [...this.cache.slice(0, offset - this.offset), ...arr];
			} else if (offset < this.offset && offset + limit === this.offset + 1) {
				// ----====
				this.cache = [...arr, ...this.cache.slice(limit)];
				this.offset = offset;
			} else if (offset + fetchingLimit > this.offset && offset + fetchingLimit < this.offset + this.length) {
				// --≡≡==
				this.cache = [...arr, ...this.cache.slice(this.startLimit - limit)];
				this.offset = offset;
			} else if (offset + fetchingLimit < this.offset
				|| (offset < this.offset && offset + fetchingLimit >= this.offset + this.length)
				|| offset > this.offset + this.length) {
				// ----  ==== or ---≡≡≡≡-- or ====  ----
				this.cache = arr;
				this.offset = offset;
			} else if (offset < this.offset && offset + limit === this.offset) {
				// ----====
				this.cache = [...arr, ...this.cache];
				this.offset = offset;
			} else if (offset === 0 && arr.length === this.length) {
				// ≡≡≡≡
				// cache already have all data

			} else {
				throw new Error("No match in fetcher");
			}

			return fromCache();
		});
	}
}
