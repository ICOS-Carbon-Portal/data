import {
	type SpecBasicsQuery,
	type SpecVarMetaQuery,
	type DobjOriginsAndCountsQuery
} from '../sparqlQueries';
import SpecTable, {
	type Value, Filter, type Row, type TableSerialized
} from "./SpecTable";
import {type QueryResultColumns} from '../backend/sparql';


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
};
type CompositeSpecTableArray = [SpecTable<BasicsColNames>, SpecTable<VariableMetaColNames>, SpecTable<OriginsColNames>];

export default class CompositeSpecTable {
	public readonly id: symbol;

	constructor(readonly basics: SpecTable<BasicsColNames>, readonly columnMeta: SpecTable<VariableMetaColNames>, readonly origins: SpecTable<OriginsColNames>) {
		this.id = Symbol('CompositeSpecTable');
	}

	static fromTables(tables: CompositeSpecTableArray) {
		return new CompositeSpecTable(tables[0], tables[1], tables[2]);
	}

	get serialize(): SpecTableSerialized {
		return {
			basics: this.basics.serialize,
			columnMeta: this.columnMeta.serialize,
			origins: this.origins.serialize
		};
	}

	static deserialize(tables: SpecTableSerialized) {
		const {basics, columnMeta, origins} = tables;

		const basicsTbl = SpecTable.deserialize(basics);
		const columnMetaTbl = SpecTable.deserialize(columnMeta);
		const originsTbl = SpecTable.deserialize(origins);

		return new CompositeSpecTable(basicsTbl, columnMetaTbl, originsTbl).withFilterReflection;
	}

	get tables(): CompositeSpecTableArray {
		return [this.basics, this.columnMeta, this.origins];
	}

	mapTables(
		callback: <K extends ColNames>(element: SpecTable<K>, index: number, array: CompositeSpecTableArray) => SpecTable<K>
	): CompositeSpecTableArray {
		const tables = this.tables;
		return [
			callback(this.basics, 0, tables),
			callback(this.columnMeta, 1, tables),
			callback(this.origins, 2, tables)
		];
	}

	getTable(name: TableNames): SpecTable {
		switch (name) {
			case "basics": return this.basics;
			case "columnMeta": return this.columnMeta;
			case "origins": return this.origins;
		}
	}

	getTableRows(name: TableNames): Row<string>[] {
		return this.getTable(name).rows;
	}

	get basicsRows() {
		return this.basics.rows;
	}

	get columnMetaRows() {
		return this.columnMeta.rows;
	}

	get originsRows() {
		return this.origins.rows;
	}

	get isInitialized() {
		return this.basicsRows.length > 0 && this.columnMetaRows.length > 0;
	}

	get names(): Array<ColNames> {
		const toFlatMap = this.tables.map(tbl => tbl.colNames);
		return toFlatMap.flat();
	}

	get tableNames(): TableNames[] {
		return [...tableNames];
	}

	findTable(columnName: ColNames): SpecTable | undefined {
		return this.tables.find(tbl =>
			(tbl.colNames as ColNames[]).includes(columnName));
	}

	/* TODO: This function is probably somewhat broken because colName could exist on multiple SpecTables within the composite spec table;
	 * in that case, only the first table would have the filter applied. */
	withFilter(colName: ColNames, filter: Filter): CompositeSpecTable {
		const table = this.findTable(colName);
		if (table === undefined) {
			return this;
		}

		return CompositeSpecTable.fromTables(
			this.mapTables(<K extends ColNames>(tbl: SpecTable<K>) => tbl === table ? tbl.withFilter(colName as K, filter) : tbl)
		).withFilterReflection;
	}

	get withFilterReflection(): CompositeSpecTable {
		const specFilters = [
			this.basics.ownSpecFilter,
			this.columnMeta.ownSpecFilter,
			this.origins.implicitOwnSpecFilter // origins is special, affected by continuous-var filters
		];
		const specsCount = this.basics.specsCount;

		const specFilterJoin = (excludedIdx: number): Filter => {
			const chosenFilts = specFilters.filter((_, idx) => idx !== excludedIdx);
			const specFilter0 = Filter.and(chosenFilts);
			return specFilter0 === null
				? null
				: (specFilter0.length < specsCount
					? specFilter0
					: null);
		};

		const reflectedTables = this.mapTables((t, idx) => t.withExtraSpecFilter(specFilterJoin(idx)));
		return CompositeSpecTable.fromTables(reflectedTables);
	}

	withResetFilters() {
		return new CompositeSpecTable(this.basics.withResetFilters(), this.columnMeta.withResetFilters(), this.origins.withResetFilters()).withFilterReflection;
	}

	withOriginsTable(origins: SpecTable<OriginsColNames>): CompositeSpecTable {
		const newOrigins = origins.withFilters(this.origins.filters);
		return new CompositeSpecTable(this.basics, this.columnMeta, newOrigins).withFilterReflection;
	}

	getFilter(colName: ColNames): Filter {
		return this.findTable(colName)?.getFilter(colName) ?? null;
	}

	get hasActiveFilters(): boolean {
		return this.tables.some(tbl => tbl.hasOwnFilters);
	}

	getDistinctAvailableColValues(colName: ColNames): Value[] {
		return this.findTable(colName)?.getDistinctAvailableColValues(colName) ?? [];
	}

	getAllDistinctAvailableColValues(colName: ColNames): Value[] {
		const table = this.findTable(colName);
		return table
			? table.getAllColValues(colName)
			: [];
	}

	getColumnValuesFilter(colName: ColNames): Filter {
		return this.findTable(colName)?.getColumnValuesFilter(colName) ?? null;
	}
}
