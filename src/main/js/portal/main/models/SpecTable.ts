import {SPECCOL} from '../sparqlQueries';

type Value = number | string;
type Col<T extends string> = T | typeof SPECCOL;
type Filters<T extends string> = {[key in Col<T>]?: Value[]};
type Row<T extends string> = {[key in Col<T>]: Value};

function isNonSpecCol<T extends string>(col: Col<T>): col is T{
	return col !== SPECCOL;
}

export default class SpecTable<T extends string>{
	private readonly colNames: Col<T>[];
	private readonly filters: Filters<T>;
	private readonly specsCount: number;
	readonly rows: Row<T>[];

	constructor(colNames: Col<T>[], rows: Row<T>[], filters: Filters<T>){
		this.colNames = colNames;

		if(filters) this.filters = filters;
		else {
			this.filters = {};
			this.colNames.forEach(col => this.filters[col] = []);
		}

		this.specsCount = distinct(rows.map(row => row[SPECCOL])).length;
		this.rows = rows;
	}

	get serialize(){
		return {
			colNames: this.colNames,
			rows: this.rows,
			filters: this.filters
		};
	}

	get names(): T[]{
		return this.colNames.filter(isNonSpecCol);
	}

	withFilter(colName: Col<T>, values: Value[]): SpecTable<T>{
		if(!this.colNames.includes(colName)) return this;
		const newFilters = Object.assign({}, this.filters, {[colName]: values});
		return new SpecTable(this.colNames, this.rows, newFilters);
	}

	getFilter(colName: Col<T>): Value[]{
		return this.filters[colName] ?? [];
	}

	withResetFilters(){
		return new SpecTable(this.colNames, this.rows, {});
	}

	getDistinctAvailableColValues(colName: Col<T>): Value[]{
		return distinct(this.rowsFilteredByOthers(colName).map(row => row[colName]));
	}

	getDistinctColValues(colName: Col<T>){
		return distinct(this.filteredRows.map(row => row[colName]));
	}

	rowsFilteredByOthers(excludedColumn: Col<T>){
		const filters = Object.assign({}, this.filters);
		filters[excludedColumn] = [];
		return this.filterRows(filters);
	}

	get filteredRows(){
		return this.filterRows(this.filters);
	}

	private filterRows(filters: Filters<T>): Row<T>[]{
		const colNames = Object.keys(filters) as T[];
		return this.rows.filter(row => {
			return colNames.every(colName => {
				const filter: Value[] = filters[colName] ?? [];
				return !filter.length || filter.includes(row[colName]);
			});
		});
	}

	get speciesFilter(): Value[]{
		if(this.names.every(name => this.getFilter(name).length === 0)) return [];
		const filter = this.getDistinctAvailableColValues(SPECCOL);
		return filter.length === this.specsCount ? [] : filter;
	}

	getColumnValuesFilter(colName: Col<T>): Value[]{
		return this.colNames.some(name => this.getFilter(name).length !== 0)
			? this.getDistinctColValues(colName)
			: [];
	}

	getAllColValues(colName: Col<T>): Value[]{
		return distinct(this.rows.map(row => row[colName]));
	}

}

function distinct(stringArray: Value[]){
	return Array.from(new Set(stringArray).values());
}

