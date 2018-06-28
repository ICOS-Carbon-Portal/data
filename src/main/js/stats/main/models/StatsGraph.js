export default class StatsGraph {
	constructor(dateUnit, data){
		this._dateUnit = dateUnit;
		this._data = [];
		this._weeks = [];

		if (data) this.parseData(data);
	}

	parseData(data){
		this._data = data.map(d => [new Date(d._id.$date), d.count]);
		this._weeks = data.map(d => d.week);
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

	get weeks(){
		return this._weeks;
	}
}