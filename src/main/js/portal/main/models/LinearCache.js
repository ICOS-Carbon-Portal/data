
export default class LinearCache{

	constructor(fetcher, startOffset, startLimit){
		this._fetcher = fetcher;
		this._offset = startOffset || 0;
		this._startLimit = startLimit;
		this._cache = [];
		this._isDataEndReached = false;
	}

	get length(){
		return this._cache.length;
	}

	get cache(){
		return this._cache;
	}

	get offset(){
		return this._offset;
	}

	get isDataEndReached(){
		return this._isDataEndReached;
	}

	fetch(offset, limit){
		const fromCache = () => this._cache.slice(offset - this._offset, offset - this._offset + limit);

		const useCache = offset >= this._offset && (this._isDataEndReached || offset + limit <= this._offset + this.length);

		if (useCache) return Promise.resolve(fromCache());

		const fetchingLimit = Math.max(limit, this._startLimit);

		// Add an extra record to fetchingLimit so we know if we hit the end of data
		return this._fetcher(offset, fetchingLimit + 1).then(arr => {
			this._isDataEndReached = this._isDataEndReached === true ? true : arr.length < fetchingLimit + 1;
			if (arr.length === fetchingLimit + 1) arr.pop();

			// arr: ----
			// cache: ====
			// overlap: ≡≡≡

			if (this.length === 0 || offset === this._offset + this.length) {
				// ====----
				this._cache = this._cache.concat(arr);

			} else if (offset > this._offset && offset < this._offset + this.length) {
				// ==≡≡--
				this._cache = this._cache.slice(0, offset - this._offset).concat(arr);

			} else if (offset < this._offset && offset + limit === this._offset + 1){
				// ----====
				this._cache = arr.concat(this._cache.slice(limit));
				this._offset = offset;

			} else if (offset + fetchingLimit > this._offset && offset + fetchingLimit < this._offset + this.length){
				// --≡≡==
				this._cache = arr.concat(this._cache.slice(this._startLimit - limit));
				this._offset = offset;

			} else if (offset + fetchingLimit < this._offset
					|| (offset < this._offset && offset + fetchingLimit >= this._offset + this.length)
					|| offset > this._offset + this.length){
				// ----  ==== or ---≡≡≡≡-- or ====  ----
				this._cache = arr;
				this._offset = offset;
			} else {
				throw new Error("No match in fetcher");
			}

			return fromCache();
		});
	}
}
