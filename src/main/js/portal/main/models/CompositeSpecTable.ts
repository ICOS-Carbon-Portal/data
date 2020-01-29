import {
	basicColNames,
	columnMetaColNames,
	originsColNames,
	SPECCOL
} from '../sparqlQueries';
import SpecTable, {Filters, Value, Filter} from "./SpecTable";
import {ThenArg} from "../backend/declarations";
import {fetchBoostrapData} from "../backend";
import {CategoryType} from "../config";


type JsonCompositeSpecTable = ThenArg<typeof fetchBoostrapData>['specTables'];
export type BasicsColNames = typeof basicColNames[number];
export type ColumnMetaColNames = typeof columnMetaColNames[number];
export type OriginsColNames = typeof originsColNames[number];
export type ColNames = BasicsColNames | ColumnMetaColNames | OriginsColNames | CategoryType;

const tableNames = ['basics', 'columnMeta', 'origins'] as const;
type TableNames = typeof tableNames[number];

export default class CompositeSpecTable{
	constructor(readonly basics: SpecTable<BasicsColNames>, readonly columnMeta: SpecTable<ColumnMetaColNames>, readonly origins: SpecTable<OriginsColNames>){}

	static fromTables(tables: SpecTable[]){
		return new CompositeSpecTable(
			tables[0] as SpecTable<BasicsColNames>,
			tables[1] as SpecTable<ColumnMetaColNames>,
			tables[2] as SpecTable<OriginsColNames>
		);
	}

	get serialize(){
		return {
			basics: this.basics.serialize,
			columnMeta: this.columnMeta.serialize,
			origins: this.origins.serialize
		}
	}

	static deserialize(tables: CompositeSpecTable | JsonCompositeSpecTable) {
		const {basics, columnMeta, origins} = tables;
		const basicsTbl = new SpecTable(basics.colNames, basics.rows, basics.filters as Filters<BasicsColNames>);
		const columnMetaTbl = new SpecTable(columnMeta.colNames, columnMeta.rows, columnMeta.filters as Filters<ColumnMetaColNames>);
		const originsTbl = new SpecTable(origins.colNames, origins.rows, origins.filters as Filters<OriginsColNames>);
		const extraFilter = getExtraFilter(basicsTbl.specsCount, originsTbl);

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

	getTableRows(name: TableNames){
		return this.getTable(name).rows;
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
