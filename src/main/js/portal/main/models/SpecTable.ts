import {SPECCOL} from '../sparqlQueries';
import {distinct} from '../utils'

export type Value = number | string | undefined;
export type Filter = null | Array<Value>;
export type Col<T extends string> = T | typeof SPECCOL;
export type Filters<T extends string> = {[key in T]?: Filter};
export type Row<T extends string> = {[key in Col<T>]: Value};


export const Filter = {
	and: function (fs: Filter[]): Filter {
		return fs.reduce((acc, curr) => {
			if(acc === null) return curr;
			if(curr === null) return acc;
			const soFar = new Set(acc);
			return curr.filter(v => soFar.has(v));
		}, null);
	},
	allowsNothing: function(f: Filter): boolean {
		return f !== null && f.length === 0;
	}
};

export const Value = {
	isDefined: function(v: Value): v is (number | string) {
		return v !== undefined;
	},
	isString: function(v: Value): v is string{
		return v !== undefined && (typeof v) == "string"
	}
};

export type TableSerialized<T extends string> = {
	colNames: Col<T>[]
	rows: Row<T>[]
	filters?: Filters<T>
	extraSpecFilter?: Filter
}

export default class SpecTable<T extends string = string>{
	readonly specsCount: number;

	constructor(readonly colNames: T[], readonly rows: Row<T>[], readonly filters: Filters<T>, readonly extraSpecFilter: Filter = null){
		this.specsCount = distinct(rows.map(row => row[SPECCOL])).length;
	}

	get serialize(): TableSerialized<T>{
		return {
			colNames: this.colNames,
			rows: this.rows,
			filters: this.filters,
			extraSpecFilter: this.extraSpecFilter
		};
	}

	withExtraSpecFilter(extraFilter: Filter){
		return new SpecTable<T>(this.colNames, this.rows, this.filters, extraFilter);
	}

	get ownSpecFilter(): Filter{
		return this.hasOwnFilters ? this.implicitOwnSpecFilter : null;
	}

	get implicitOwnSpecFilter(): Filter{
		return this.withExtraSpecFilter(null).getDistinctColValues(SPECCOL);
	}

	withFilter(colName: T, filter: Filter): SpecTable<T>{
		if(!this.colNames.includes(colName)) return this;
		const newFilters = Object.assign({}, this.filters, {[colName]: filter});
		return new SpecTable(this.colNames, this.rows, newFilters, this.extraSpecFilter);
	}

	getFilter(colName: T): Filter {
		return this.filters[colName] ?? null;
	}

	get hasOwnFilters(): boolean{
		return Object.values(this.filters).some(f => !!f);
	}

	withResetFilters(){
		return new SpecTable(this.colNames, this.rows, {});
	}

	getDistinctAvailableColValues(colName: Col<T>): Value[] {
		return distinct(this.rowsFilteredByOthers(colName).map(row => row[colName]));
	}

	getDistinctColValues(colName: Col<T>){
		return distinct(this.filteredRows.map(row => row[colName]));
	}

	private rowsFilteredByOthers(excludedColumn: Col<T>){
		const filters: Filters<T> = {...this.filters, [excludedColumn]: null};
		return this.filterRows(filters);
	}

	get filteredRows(): Row<T>[]{
		return this.filterRows(this.filters);
	}

	get filteredColumns(): T[]{
		return (Object.keys(this.filters) as Array<keyof typeof this.filters>)
			.filter(col => this.getFilter(col) !== null);
	}

	private filterRows(filters: Filters<T>): Row<T>[]{
		const colNames = Object.keys(filters) as T[];
		const eFilter: Filter = this.extraSpecFilter;

		return this.rows.filter(row =>
			colNames.every(
				colName => {
					const filter: Filter = filters[colName] ?? null;
					return filter == null || filter.includes(row[colName]);
				}
			) && (
				eFilter == null || eFilter.includes(row[SPECCOL])
			)
		);
	}

	getColumnValuesFilter(colName: Col<T>): Filter{
		return this.hasOwnFilters ? this.getDistinctColValues(colName) : null;
	}

	getAllColValues(colName: Col<T>): Value[]{
		return distinct(this.rows.map(row => row[colName]));
	}

}
