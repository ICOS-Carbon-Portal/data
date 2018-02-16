export default class FilterFreeText{
	constructor(pidList, selectedPids){
		this._pidList = pidList || [];
		this._selectedPids = selectedPids || [];
	}

	withPidList(pidList){
		return new FilterFreeText(pidList, this._selectedPids);
	}

	withSelectedPids(selectedPids){
		return new FilterFreeText(this._pidList, selectedPids);
	}

	get pidList(){
		return Array.from(new Set(this._pidList.concat(this._selectedPids)).values());
	}

	get selectedPids(){
		return this._selectedPids;
	}

	clearPids(){
		return new FilterFreeText();
	}

	restore(items){
		if (items === undefined){
			return this;
		} else {
			return new FilterFreeText(items.pids, items.pids);
		}
	}

	get hasFilter(){
		return this._selectedPids.length > 0;
	}

	get summary(){
		const res = {};

		if (this._selectedPids.length > 0) res.pids = this._selectedPids;

		return res;
	}
}