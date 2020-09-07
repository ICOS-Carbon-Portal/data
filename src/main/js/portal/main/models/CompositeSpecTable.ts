import {
	SpecBasicsQuery,
	SpecVarMetaQuery,
	DobjOriginsAndCountsQuery,
	SPECCOL
} from '../sparqlQueries';
import SpecTable, {Value, Filter, Row, TableSerialized} from "./SpecTable";
import {AsyncResult} from "../backend/declarations";
import {fetchBoostrapData} from "../backend";
import { QueryResultColumns } from '../backend/sparql';


type JsonCompositeSpecTable = AsyncResult<typeof fetchBoostrapData>['specTables'];
export type BasicsColNames = QueryResultColumns<SpecBasicsQuery>;
export type VariableMetaColNames = QueryResultColumns<SpecVarMetaQuery>;
export type OriginsColNames = QueryResultColumns<DobjOriginsAndCountsQuery>;
export type ColNames = BasicsColNames | VariableMetaColNames | OriginsColNames;

const tableNames = ['basics', 'columnMeta', 'origins'] as const;
type TableNames = typeof tableNames[number];
export type SpecTableSerialized = {
	basics: TableSerialized<BasicsColNames>
	columnMeta: TableSerialized<VariableMetaColNames>
	origins: TableSerialized<OriginsColNames>
}

export default class CompositeSpecTable{
	constructor(readonly basics: SpecTable<BasicsColNames>, readonly columnMeta: SpecTable<VariableMetaColNames>, readonly origins: SpecTable<OriginsColNames>){}

	static fromTables(tables: SpecTable[]){
		return new CompositeSpecTable(
			tables[0] as SpecTable<BasicsColNames>,
			tables[1] as SpecTable<VariableMetaColNames>,
			tables[2] as SpecTable<OriginsColNames>
		);
	}

	get serialize(): SpecTableSerialized {
		return {
			basics: this.basics.serialize,
			columnMeta: this.columnMeta.serialize,
			origins: this.origins.serialize
		}
	}

	static deserialize(tables: SpecTableSerialized) {
		const {basics, columnMeta, origins} = tables;
		const originsTbl = new SpecTable(origins.colNames, origins.rows, origins.filters || {});
		const specValues = new Set(originsTbl.rows.map(row => row[SPECCOL]));

		function whereRelevantSpec<T extends string>(rows: Row<T>[]): Row<T>[]{
			return rows.filter(row => specValues.has(row[SPECCOL]));
		}

		const basicsTbl = new SpecTable(basics.colNames, whereRelevantSpec(basics.rows), basics.filters || {});
		const columnMetaTbl = new SpecTable(columnMeta.colNames, whereRelevantSpec(columnMeta.rows), columnMeta.filters || {});

		const extraFilter = getExtraFilter(specValues.size, originsTbl);

		return new CompositeSpecTable(basicsTbl.withExtraSpecFilter(extraFilter), columnMetaTbl.withExtraSpecFilter(extraFilter), originsTbl)
	}

	get tables(){
		return [this.basics, this.columnMeta, this.origins];
	}

	getTable(name: TableNames): SpecTable {
		switch (name){
			case "basics": return this.basics;
			case "columnMeta": return this.columnMeta;
			case "origins": return this.origins;
		}
	}

	getTableRows(name: TableNames): Row<string>[]{
		return this.getTable(name).rows;
	}

	get basicsRows(){
		return this.basics.rows;
	}

	get columnMetaRows(){
		return this.columnMeta.rows;
	}

	get originsRows(){
		return this.origins.rows;
	}

	get names(): Array<ColNames>{
		const toFlatMap = this.tables.map(tbl => tbl.names);
		return Array.prototype.concat.apply([], toFlatMap);
	}

	get tableNames(): TableNames[]{
		return tableNames.slice();
	}

	findTable(columnName: ColNames): SpecTable<string> | undefined{
		return this.tables.find(tbl =>
			(tbl.names as ColNames[]).includes(columnName)
		);
	}

	getSpeciesFilter(targetTableName: TableNames | null, getAllIfAllAllowed = false): Filter{
		const filters = this.tableNames
			.filter(tname => tname !== targetTableName) //only apply other tables' species filters to each table
			.map(tname => this.getTable(tname).speciesFilter)
			.filter(f => f !== null); //null means "all allowed"

		return filters.length
			? Filter.and(filters)
			: getAllIfAllAllowed
				? this.basics.getDistinctAvailableColValues(SPECCOL)
				: null;
	}

	withFilter(colName: ColNames, filter: Filter): CompositeSpecTable{
		const table = this.findTable(colName);
		if(table === undefined) return this;
		let tables = this.tables.map(tbl => tbl === table ? table.withFilter(colName, filter) : tbl);

		const pass1 = CompositeSpecTable.fromTables(tables);

		tables = tableNames.map(tName => {
			const specFilter = pass1.getSpeciesFilter(tName);
			return pass1.getTable(tName).withFilter(SPECCOL, specFilter);
		});

		return CompositeSpecTable.fromTables(tables);
	}

	withResetFilters(){
		return new CompositeSpecTable(this.basics.withResetFilters(), this.columnMeta.withResetFilters(), this.origins.withResetFilters());
	}

	withOriginsTable(origins: JsonCompositeSpecTable['origins'] | CompositeSpecTable['origins'], useExtraFilter: boolean){
		const newOrigins = new SpecTable<OriginsColNames>(origins.colNames, origins.rows, this.origins.filters);
		const extraFilter = useExtraFilter ? getExtraFilter(this.basics.specsCount, newOrigins) : null;

		return new CompositeSpecTable(
			this.basics.withExtraSpecFilter(extraFilter),
			this.columnMeta.withExtraSpecFilter(extraFilter),
			newOrigins
		);
	}

	getFilter(colName: ColNames): Filter {
		return this.findTable(colName)?.getFilter(colName) ?? null;
	}

	get hasActiveFilters(): boolean{
		return this.tables.some(tbl => tbl.hasActiveFilters);
	}

	getDistinctAvailableColValues(colName: ColNames): Value[]{
		return this.findTable(colName)?.getDistinctAvailableColValues(colName) ?? [];
	}

	getAllDistinctAvailableColValues(colName: ColNames): Value[]{
		const table = this.findTable(colName);
		return table
			? table.getAllColValues(colName)
			: [];
	}

	getColumnValuesFilter(colName: ColNames): Filter {
		return this.findTable(colName)?.getColumnValuesFilter(colName) ?? null;
	}

}

function getExtraFilter(specsCount: number, origins: SpecTable<OriginsColNames>): Filter{
	const originSpecs = origins.getAllColValues(SPECCOL);
	return originSpecs.length < specsCount ? originSpecs : null;
}
