import {SPECCOL} from '../sparqlQueries';

export default class SpecTable{
	constructor(colNames, rows, filters){
		this._colNames = colNames;

		if(filters) this._filters = filters;
		else {
			this._filters = {};
			this.names.forEach(col => this._filters[col] = []);
		}

		this._rows = rows;
	}

	get names(){
		return this._colNames.filter(col => col !== SPECCOL);
	}

	withFilter(colName, values){
		const newFilters = Object.assign({}, this._filters, {[colName]: values});
		return new SpecTable(this._colNames, this._rows, newFilters);
	}

	getDistinctColValues(colName){
		return distinct(this._rows.map(row => row[colName]));
	}

	getDistinctColObjects(colName){
		const values = this.getDistinctColValues(colName);

		return values.map((v, idx) => {
			return {
				id: idx,
				text: v,
				isIntExcl: false,
				isExtExcl: false
			};
		});
	}
}

function distinct(stringArray){
	return Array.from(new Set(stringArray).values());
}

