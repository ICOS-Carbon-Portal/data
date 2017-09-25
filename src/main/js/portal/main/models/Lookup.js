import config from '../config';

export default class Lookup{
	constructor(specTable){
		this._table = this.parseSpecTable(specTable);
	}

	parseSpecTable(specTable) {
		const basicsRows = specTable.getTable("basics") ? specTable.getTableRows("basics") : undefined;
		const columnMetaRows = specTable.getTable("columnMeta") ? specTable.getTableRows("columnMeta") : undefined;

		const netcdf = basicsRows
			? basicsRows.reduce((acc, curr) => {
				if (curr.format === 'NetCDF'){
					acc[curr.spec] = {
						type: config.NETCDF
					}
				}

				return acc;
			}, {})
			: [];

		const timeSeries = columnMetaRows
			? columnMetaRows.reduce((acc, curr) => {
				acc[curr.spec] === undefined
					? acc[curr.spec] = {
						type: config.TIMESERIES,
						options: [curr.colTitle]
					}
					: acc[curr.spec].options.push(curr.colTitle);

				return acc;

			}, {})
			: [];

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