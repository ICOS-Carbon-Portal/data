import {SPECCOL} from '../sparqlQueries';

export default class CompositeSpecTable{

	constructor(nameToTableKv){
		this._tables = nameToTableKv;
	}

	get tables(){
		return this.tableNames.map(name => this._tables[name]);
	}

	getTable(name){
		return this._tables[name];
	}

	getTableRows(name){
		return this._tables[name]._rows;
	}

	get names(){
		const toFlatMap = this.tables.map(tbl => tbl.names);
		return Array.prototype.concat.apply([], toFlatMap);
	}

	get tableNames(){
		return Object.keys(this._tables);
	}

	findTableName(columnName){
		return this.tableNames.find(tname => this.getTable(tname).names.includes(columnName));
	}

	findTable(columnName){
		return this.getTable(this.findTableName(columnName));
	}

	getSpeciesFilter(targetTableName){
		const filters = this.tableNames
			.filter(tname => tname !== targetTableName) //only apply other tables' species filters to each table
			.map(tname => this.getTable(tname).speciesFilter)
			.filter(f => f.length); //empty means "all allowed"
		return filters.length
			? filters.reduce((acc, curr) => { //AND-op on species filters
				const currSet = new Set(curr);
				return acc.filter(elem => currSet.has(elem));
			})
			: [];
	}

	withFilter(colName, values){
		const tableName = this.findTableName(colName);
		const newTable = this.getTable(tableName).withFilter(colName, values);
		const pass1 = new CompositeSpecTable(Object.assign({}, this._tables, {[tableName]: newTable}));

		const pass2 = {};
		this.tableNames.forEach(tname => {
			pass2[tname] = pass1.getTable(tname).withFilter(SPECCOL, pass1.getSpeciesFilter(tname));
		});
		return new CompositeSpecTable(pass2);
	}

	withResetFilters(){
		const tables = {};
		for (let key in this._tables){
			tables[key] = this._tables[key].withResetFilters();
		}

		return new CompositeSpecTable(tables);
	}

	getFilter(colName){
		return this.findTable(colName).getFilter(colName);
	}

	getDistinctAvailableColValues(colName){
		return this.findTable(colName).getDistinctAvailableColValues(colName);
	}

}


