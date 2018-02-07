export default class FilterFreeText{
	constructor(pids){
		this._pids = pids || [];
	}

	withPids(pids){
		return new FilterFreeText(pids);
	}

	get pids(){
		return this._pids;
	}

	clearPids(){
		return new FilterFreeText();
	}

	restore(items){
		if (items === undefined){
			return this;
		} else {
			return new FilterFreeText([items.pid]);
		}
	}

	get summary(){
		const res = {};

		if (this._pids.length === 1) res.pid = this._pids[0];

		return res;
	}
}
