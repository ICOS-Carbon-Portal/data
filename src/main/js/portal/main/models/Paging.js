import config from '../config';


export default class Paging{
	constructor({objCount, offset, pageCount, filtersEnabled, cacheSize, cacheOffset, isDataEndReached}){
		this._objCount = objCount;
		this._offset = offset || 0;
		this._pageCount = pageCount;
		this._limit = config.stepsize;
		this._filtersEnabled = !!filtersEnabled;
		this._cacheSize = cacheSize;
		this._cacheOffset = isNaN(cacheOffset) ? this._offset : cacheOffset;
		this._isDataEndReached = isDataEndReached;
	}

	get objCount(){
		return this._filtersEnabled
			? Math.max(this._cacheOffset + this._cacheSize || 0, this._offset + this._pageCount)
			: this._objCount;
	}

	get offset(){
		return this._offset;
	}

	get pageCount(){
		return this._pageCount;
	}

	get limit(){
		return this._limit;
	}

	get isCountKnown(){
		return this._filtersEnabled ? this._isDataEndReached : true;
	}

	withDirection(direction){
		if (direction < 0){
			if (this._offset === 0) return this;
			const offset = Math.max(0, this._offset - this._limit);
			return new Paging({
				objCount: this._objCount,
				offset,
				cacheOffset: Math.min(offset, this._cacheOffset),
				isDataEndReached: this._isDataEndReached
			});

		} else if (direction > 0){
			if (this._offset + this._limit >= this._objCount) return this;
			const offset = this._offset + this._limit;
			return new Paging({
				objCount: this._objCount,
				offset,
				cacheOffset: this._cacheOffset,
				isDataEndReached: this._isDataEndReached
			});

		} else return this;
	}

	withObjCount(objCount, pageCount, filtersEnabled, cacheSize, isDataEndReached){
		return new Paging({
			objCount,
			offset: this._offset,
			pageCount,
			filtersEnabled,
			cacheSize,
			cacheOffset: this._cacheOffset,
			isDataEndReached: isDataEndReached
		});
	}

	withFiltersEnabled(filtersEnabled){
		return new Paging({
			objCount: this._objCount,
			offset: 0,
			pageCount: this._pageCount,
			filtersEnabled,
			cacheSize: this._cacheSize,
			isDataEndReached: this._isDataEndReached
		});
	}
}

