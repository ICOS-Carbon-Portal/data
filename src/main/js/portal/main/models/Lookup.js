import config from '../config';

export default class Lookup{
	constructor(specTable){
		this._table = this.parseSpecTable(specTable);
	}

	parseSpecTable(specTable) {

		const netcdf = {};
		specTable.getTableRows("basics").forEach(br => {
			if (br.format === config.netCdfFormat) netcdf[br.spec] = {type: config.NETCDF};
		});

		const timeSeries = {};
		specTable.getTableRows("columnMeta").forEach(cmr => {
			if(timeSeries[cmr.spec] === undefined) timeSeries[cmr.spec] = {type: config.TIMESERIES, options: []};
			timeSeries[cmr.spec].options.push(cmr.colTitle);
		});

		return Object.assign({}, netcdf, timeSeries);
	}

	getSpecLookup(spec) {
		return this._table && this._table[spec]
			? this._table[spec]
			: undefined;
	}

	getSpecLookupType(spec){
		const specLookup = this.getSpecLookup(spec);
		return specLookup ? this.getSpecLookup(spec).type : undefined;
	}

	get table(){
		return this._table;
	}
}