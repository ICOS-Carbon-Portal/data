import {SPECCOL} from '../sparqlQueries';
import SpecTable from "./SpecTable";


const labelColNameMapper = {
	project: 'projectLabel',
	theme: 'themeLabel',
	station: 'stationLabel',
	submitter: 'submitterLabel',
	type: 'specLabel',
	format: 'formatLabel',
	valType: 'valTypeLabel',
	quantityKind: 'quantityKindLabel'
};

export default class CompositeSpecTable{

	constructor(nameToTableKv){
		this._tables = nameToTableKv;
	}

	get serialize(){
		return Object.keys(this._tables).reduce((acc, key) => {
			acc[key] = this._tables[key].serialize;
			return acc;
		}, {});
	}

	static deserialize(jsonCompositeSpecTable) {
		const basics = jsonCompositeSpecTable.basics;
		const columnMeta = jsonCompositeSpecTable.columnMeta;
		const origins = jsonCompositeSpecTable.origins;

		return new CompositeSpecTable({
			basics: new SpecTable(...Object.keys(basics).map(t => basics[t])),
			columnMeta: new SpecTable(...Object.keys(columnMeta).map(t => columnMeta[t])),
			origins: new SpecTable(...Object.keys(origins).map(t => origins[t]))
		});
	}

	get tables(){
		return this.tableNames.map(name => this._tables[name]);
	}

	getTable(name){
		return this._tables[name];
	}

	getTableRows(name){
		const table = this._tables[name];
		return table ? table._rows : [];
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

	getSpeciesFilter(targetTableName, getAllIfAllAllowed = false){
		const filters = this.tableNames
			.filter(tname => tname !== targetTableName) //only apply other tables' species filters to each table
			.map(tname => this.getTable(tname).speciesFilter)
			.filter(f => f.length); //empty means "all allowed"
		return filters.length
			? filters.reduce((acc, curr) => { //AND-op on species filters
				const currSet = new Set(curr);
				return acc.filter(elem => currSet.has(elem));
			})
			: getAllIfAllAllowed
				? this._tables.basics.getDistinctAvailableColValues(SPECCOL)
				: [];
	}

	withFilter(colName, values){
		const tableName = this.findTableName(colName);
		const newTable = this.getTable(tableName).withFilter(colName, values);
		const pass1 = new CompositeSpecTable(Object.assign({}, this._tables, {[tableName]: newTable}));

		const pass2 = {};
		this.tableNames.forEach(tname => {
			const specFilter = pass1.getSpeciesFilter(tname);
			pass2[tname] = pass1.getTable(tname).withFilter(SPECCOL, specFilter);
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

	withOriginsTable(originJson){
		return new CompositeSpecTable({
			basics: this.getTable('basics'),
			columnMeta: this.getTable('columnMeta'),
			origins: new SpecTable(...Object.keys(originJson).map(t => originJson[t]))
		});
	}

	getFilter(colName){
		return this.findTable(colName).getFilter(colName);
	}

	getDistinctAvailableColValues(colName){
		return this.findTable(colName).getDistinctAvailableColValues(colName);
	}

	getAllDistinctAvailableColValues(colName){
		const table = this.findTable(colName);
		return table
			? table.getAllColValues(colName)
			: [];
	}

	getColumnValuesFilter(colName){
		return this.findTable(colName).getColumnValuesFilter(colName);
	}

	getColLabelNamePair(colName){
		return labelColNameMapper[colName] ? [colName, labelColNameMapper[colName]] : [colName, colName];
	}

	getLabelName(colName){
		return labelColNameMapper[colName] ? labelColNameMapper[colName] : colName;
	}

	getLabelFilter(colName){
		const columnValues = this.getFilter(colName);
		const labelName = this.getLabelName(colName);

		if (colName === labelName) {
			return columnValues;
		} else {
			const rows = this.findTable(colName).rows;
			return columnValues.map(val => rows.find(row => val === row[colName])[labelName]);
		}
	}
}


