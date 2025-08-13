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

export default class CompositeSpecTable {
	public readonly id: symbol;

	constructor(readonly basics: SpecTable<BasicsColNames>, readonly columnMeta: SpecTable<VariableMetaColNames>, readonly origins: SpecTable<OriginsColNames>) {
		this.id = Symbol("CompositeSpecTable id");
	}

	static fromTables(tables: SpecTable[]) {
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
		};
	}

	static deserialize(tables: SpecTableSerialized) {
		const {basics, columnMeta, origins} = tables;

		const basicsTbl = SpecTable.deserialize(basics);
		const columnMetaTbl = SpecTable.deserialize(columnMeta);
		const originsTbl = SpecTable.deserialize(origins);

		return new CompositeSpecTable(basicsTbl, columnMetaTbl, originsTbl).withFilterReflection;
	}

	get tables() {
		return [this.basics, this.columnMeta, this.origins];
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

	withFilter(colName: ColNames, filter: Filter): CompositeSpecTable {
		const table = this.findTable(colName);
		if (table === undefined) {
			return this;
		}

		return CompositeSpecTable.fromTables(
			this.tables.map(tbl => tbl === table ? table.withFilter(colName, filter) : tbl)
		).withFilterReflection;
	}

	get withFilterReflection(): CompositeSpecTable {
		const self = this;
		const specFilters = [
			this.basics.ownSpecFilter,
			this.columnMeta.ownSpecFilter,
			this.origins.implicitOwnSpecFilter // origins is special, affected by continuous-var filters
		];

		function specFilterJoin(excludedIdx: number): Filter {
			const chosenFilts = specFilters.filter((_, idx) => idx !== excludedIdx);
			const specFilter0 = Filter.and(chosenFilts);
			return specFilter0 === null
				? null
				: (specFilter0.length < self.basics.specsCount
					? specFilter0
					: null);
		}

		const reflectedTables = this.tables.map((t, idx) => t.withExtraSpecFilter(specFilterJoin(idx)));
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
