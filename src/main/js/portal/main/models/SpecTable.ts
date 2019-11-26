import {SPECCOL} from '../sparqlQueries';

export type Value = number | string | undefined;
export type Col<T extends string> = T | typeof SPECCOL;
export type Filters<T extends string> = {[key in Col<T>]?: Value[]};
export type Row<T extends string> = {[key in Col<T>]: Value};

function isNonSpecCol<T extends string>(col: Col<T>): col is T{
	return col !== SPECCOL;
}

export default class SpecTable<T extends string = string>{
	readonly specsCount: number;

	constructor(readonly colNames: Col<T>[], readonly rows: Row<T>[], readonly filters: Filters<T>, readonly extraSpecFilter: Value[] = []){
		this.specsCount = distinct(rows.map(row => row[SPECCOL])).length;
	}

	get serialize(){
		return {
			colNames: this.colNames,
			rows: this.rows,
			filters: this.filters,
			extraSpecFilter: this.extraSpecFilter
		};
	}

	get names(): T[] {
		return this.colNames.filter(isNonSpecCol);
	}

	withExtraSpecFilter(vals: Value[]){
		return new SpecTable<T>(this.colNames, this.rows, this.filters, vals);
	}

	withFilter(colName: Col<T>, values: Value[]): SpecTable<T>{
		if(!this.colNames.includes(colName)) return this;
		const newFilters = Object.assign({}, this.filters, {[colName]: values});
		return new SpecTable(this.colNames, this.rows, newFilters, this.extraSpecFilter);
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

	get filteredRows(): Row<T>[]{
		return this.filterRows(this.filters);
	}

	private filterRows(filters: Filters<T>): Row<T>[]{
		const colNames = Object.keys(filters) as T[];
		const extraFilter: (row: Row<T>) => boolean =
			this.extraSpecFilter.length > 0
				? row => this.extraSpecFilter.includes(row[SPECCOL])
				: _ => true;

		return this.rows.filter(row => {
			return colNames.every(colName => {
				const filter: Value[] = filters[colName] ?? [];
				return !filter.length || filter.includes(row[colName]);
			}) && extraFilter(row);
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

