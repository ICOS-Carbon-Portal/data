import config from '../config';

interface Props {
	objCount: number
	offset?: number
	limit?: number
	pageCount?: number
	filtersEnabled?: boolean
	cacheOffset?: number
	isDataEndReached?: boolean
	receivedCount?: number
	receivedCountFetching?: boolean
}
type Offset = number;
type FiltersEnabled = Required<Pick<Props, 'filtersEnabled'>>['filtersEnabled'];
type WithProps = Pick<Props, 'objCount' | 'pageCount' | 'filtersEnabled' | 'isDataEndReached'>;

export default class Paging{
	private _objCount: number;
	private _offset: number;
	private _pageCount: number;
	private _limit: number;
	private _filtersEnabled: boolean;
	private _cacheOffset: number;
	private _isDataEndReached: boolean;
	// Actual number of data objects received for the full result set (populated by an
	// automatic full-count fetch once results load). Depends only on the filters, so it
	// persists across paging/sorting and is reset (to undefined) only when filters change.
	private _receivedCount?: number;
	// True while a full-count fetch is in progress (button-triggered).
	private _receivedCountFetching: boolean;

	constructor({objCount, offset, limit, pageCount, filtersEnabled, cacheOffset, isDataEndReached, receivedCount, receivedCountFetching}: Props){
		this._objCount = objCount;
		this._offset = offset || 0;
		this._pageCount = pageCount ?? config.stepsize;
		this._limit = limit ?? config.stepsize;
		this._filtersEnabled = filtersEnabled || false;
		this._cacheOffset = cacheOffset ?? this._offset;
		this._isDataEndReached = isDataEndReached || false;
		this._receivedCount = receivedCount;
		this._receivedCountFetching = receivedCountFetching || false;
	}

	get serialize(){
		return {
			objCount: this._objCount,
			offset: this._offset,
			pageCount: this._pageCount,
			filtersEnabled: this._filtersEnabled,
			cacheOffset: this._cacheOffset,
			isDataEndReached: this._isDataEndReached,
			receivedCount: this._receivedCount,
			receivedCountFetching: this._receivedCountFetching
		};
	}

	static deserialize(jsonPaging: Props) {
		return new Paging(jsonPaging);
	}

	get objCount(){
		return this._objCount;
	}

	get offset(){
		return this._offset;
	}

	set offset(offset: Offset){
		this._offset = offset;
	}

	get pageCount(){
		return this._pageCount;
	}

	get limit(){
		return this._limit;
	}

	get isDataEndReached(){
		return this._isDataEndReached;
	}

	get receivedCount(){
		return this._receivedCount;
	}

	get receivedCountFetching(){
		return this._receivedCountFetching;
	}

	// Explicitly set the full received-count (e.g. from a button-triggered full fetch),
	// clearing the fetching flag.
	withReceivedCount(receivedCount: number){
		return new Paging({...this.serialize, receivedCount, receivedCountFetching: false});
	}

	withReceivedCountFetching(receivedCountFetching: boolean){
		return new Paging({...this.serialize, receivedCountFetching});
	}

	withOffset(offset: Offset){
		return new Paging({
			objCount: this._objCount,
			offset: offset,
			pageCount: this._pageCount,
			filtersEnabled: this._filtersEnabled,
			isDataEndReached: this._isDataEndReached,
			receivedCount: this._receivedCount,
			receivedCountFetching: this._receivedCountFetching
		});
	}

	withDirection(direction: -1 | 1){
		if (direction < 0){
			if (this._offset === 0) return this;
			const offset = Math.max(0, this._offset - this._limit);
			return new Paging({
				objCount: this._objCount,
				offset,
				cacheOffset: Math.min(offset, this._cacheOffset),
				isDataEndReached: this._isDataEndReached,
				receivedCount: this._receivedCount,
				receivedCountFetching: this._receivedCountFetching
			});

		} else if (direction > 0){
			if (this._offset + this._limit >= this._objCount) return this;
			const offset = this._offset + this._limit;
			return new Paging({
				objCount: this._objCount,
				offset,
				cacheOffset: this._cacheOffset,
				isDataEndReached: this._isDataEndReached,
				receivedCount: this._receivedCount,
				receivedCountFetching: this._receivedCountFetching
			});

		} else return this;
	}

	// A fresh page of results: the received count depends only on the filters, so it (and
	// any in-flight full-count fetch) is preserved across paging/sorting.
	withObjCount({objCount, pageCount, filtersEnabled, isDataEndReached}: WithProps){
		return new Paging({
			objCount,
			offset: this._offset,
			pageCount,
			filtersEnabled,
			cacheOffset: this._cacheOffset,
			isDataEndReached: isDataEndReached,
			receivedCount: this._receivedCount,
			receivedCountFetching: this._receivedCountFetching
		});
	}

	withFiltersEnabled(filtersEnabled: FiltersEnabled){
		return new Paging({
			objCount: this._objCount,
			offset: this._offset,
			pageCount: this._pageCount,
			filtersEnabled,
			isDataEndReached: this._isDataEndReached,
			receivedCount: this._receivedCount,
			receivedCountFetching: this._receivedCountFetching
		});
	}
}


