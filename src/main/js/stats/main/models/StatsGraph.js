export default class StatsGraph {
	constructor(dateUnit, data){
		this._dateUnit = dateUnit;
		this._data = data ? this.parseData(data) : [];
	}

	parseData(data){
		return data.map(d => [new Date(d._id.$date), d.count]);
	}

	get dateUnit(){
		return this._dateUnit;
	}

	get data(){
		return this._data;
	}

	get hasData(){
		return this._data.length;
	}

	get dateWindow(){
		const span = Math.floor((this._data[1][0].getTime() - this._data[0][0].getTime()) / 2);
		const first = this._data[0][0].getTime() - span;
		const last = this._data[this._data.length - 1][0].getTime() + span;
		return [first, last];
	}
}