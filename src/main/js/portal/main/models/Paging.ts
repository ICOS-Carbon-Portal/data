import config from '../config';

interface Props {
	objCount: number
	offset?: number
	pageCount?: number
	filtersEnabled?: boolean
	cacheOffset?: number
	isDataEndReached?: boolean
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

	constructor({objCount, offset, pageCount, filtersEnabled, cacheOffset, isDataEndReached}: Props){
		this._objCount = objCount;
		this._offset = offset || 0;
		this._pageCount = pageCount ?? config.stepsize;
		this._limit = config.stepsize;
		this._filtersEnabled = filtersEnabled || false;
		this._cacheOffset = cacheOffset ?? this._offset;
		this._isDataEndReached = isDataEndReached || false;
	}

	get serialize(){
		return {
			objCount: this._objCount,
			offset: this._offset,
			pageCount: this._pageCount,
			filtersEnabled: this._filtersEnabled,
			cacheOffset: this._cacheOffset,
			isDataEndReached: this._isDataEndReached
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

	withOffset(offset: Offset){
		return new Paging({
			objCount: this._objCount,
			offset: offset,
			pageCount: this._pageCount,
			filtersEnabled: this._filtersEnabled,
			isDataEndReached: this._isDataEndReached
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

	withObjCount({objCount, pageCount, filtersEnabled, isDataEndReached}: WithProps){
		return new Paging({
			objCount,
			offset: this._offset,
			pageCount,
			filtersEnabled,
			cacheOffset: this._cacheOffset,
			isDataEndReached: isDataEndReached
		});
	}

	withFiltersEnabled(filtersEnabled: FiltersEnabled){
		return new Paging({
			objCount: this._objCount,
			offset: this._offset,
			pageCount: this._pageCount,
			filtersEnabled,
			isDataEndReached: this._isDataEndReached
		});
	}
}


