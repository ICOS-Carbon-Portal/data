import {ThenArg} from "../backend/declarations";
import {fetchFilteredDataObjects} from "../backend";

type Rows = ThenArg<typeof fetchFilteredDataObjects>["rows"];
type Fetcher = (offset: number, limit: number) => Promise<Rows>

export default class LinearCache{
	public cache: Rows = [];
	public isDataEndReached = false;

	constructor(private readonly fetcher: Fetcher, private readonly startLimit: number, public offset: number){}

	get length(){
		return this.cache.length;
	}

	fetch(offset: number, limit: number){
		const fromCache = () => this.cache.slice(offset - this.offset, offset - this.offset + limit);

		const useCache = offset >= this.offset && (this.isDataEndReached || offset + limit <= this.offset + this.length);

		if (useCache) return Promise.resolve(fromCache());

		const fetchingLimit = Math.max(limit, this.startLimit);

		// Add an extra record to fetchingLimit so we know if we hit the end of data
		return this.fetcher(offset, fetchingLimit + 1).then(arr => {
			this.isDataEndReached = this.isDataEndReached ? true : arr.length < fetchingLimit + 1;
			if (arr.length === fetchingLimit + 1) arr.pop();

			// arr: ----
			// cache: ====
			// overlap: ≡≡≡

			if (this.length === 0 || offset === this.offset + this.length) {
				// ====----
				this.cache = this.cache.concat(arr);

			} else if (offset > this.offset && offset < this.offset + this.length) {
				// ==≡≡--
				this.cache = this.cache.slice(0, offset - this.offset).concat(arr);

			} else if (offset < this.offset && offset + limit === this.offset + 1){
				// ----====
				this.cache = arr.concat(this.cache.slice(limit));
				this.offset = offset;

			} else if (offset + fetchingLimit > this.offset && offset + fetchingLimit < this.offset + this.length){
				// --≡≡==
				this.cache = arr.concat(this.cache.slice(this.startLimit - limit));
				this.offset = offset;

			} else if (offset + fetchingLimit < this.offset
					|| (offset < this.offset && offset + fetchingLimit >= this.offset + this.length)
					|| offset > this.offset + this.length){
				// ----  ==== or ---≡≡≡≡-- or ====  ----
				this.cache = arr;
				this.offset = offset;

			} else if (offset < this.offset && offset + limit === this.offset){
				// ----====
				this.cache = arr.concat(this.cache);
				this.offset = offset;

			} else {
				throw new Error("No match in fetcher");
			}

			return fromCache();
		});
	}
}
