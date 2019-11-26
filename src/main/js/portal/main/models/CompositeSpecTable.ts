import {
	basicColNames,
	columnMetaColNames,
	originsColNames,
	SPECCOL
} from '../sparqlQueries';
import SpecTable, {Col, Filters, Value} from "./SpecTable";
import {KeyStrVal, ThenArg} from "../backend/declarations";
import {fetchAllSpecTables} from "../backend";
import {CategoryType} from "../config";


const labelColNameMapper: KeyStrVal = {
	project: 'projectLabel',
	theme: 'themeLabel',
	station: 'stationLabel',
	submitter: 'submitterLabel',
	type: 'specLabel',
	format: 'formatLabel',
	valType: 'valTypeLabel',
	quantityKind: 'quantityKindLabel'
};

type JsonCompositeSpecTable = ThenArg<typeof fetchAllSpecTables>['specTables'];
export type BasicsColNames = typeof basicColNames[number];
export type ColumnMetaColNames = typeof columnMetaColNames[number];
export type OriginsColNames = typeof originsColNames[number];
export type ColNames = BasicsColNames | ColumnMetaColNames | OriginsColNames | CategoryType;
export type ColNameLabels = [ColNames, ColNames] | [ColNames, typeof labelColNameMapper[keyof typeof labelColNameMapper]];

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

		return new CompositeSpecTable(
			new SpecTable(basics.colNames as Col<BasicsColNames>[], basics.rows, basics.filters as Filters<BasicsColNames>, basics.extraSpecFilter),
			new SpecTable(columnMeta.colNames as Col<ColumnMetaColNames>[], columnMeta.rows, columnMeta.filters as Filters<ColumnMetaColNames>, columnMeta.extraSpecFilter),
			new SpecTable(origins.colNames as Col<OriginsColNames>[], origins.rows, origins.filters as Filters<OriginsColNames>, origins.extraSpecFilter)
		);
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

	findTableName(columnName: ColNames){
		return this.tableNames.find(tname =>
			(this.getTable(tname).names as ColNames[]).includes(columnName)
		);
	}

	findTable(columnName: ColNames): SpecTable<string>{
		return this.getTable(this.findTableName(columnName)!);
	}

	getSpeciesFilter(targetTableName: TableNames | null, getAllIfAllAllowed = false){
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
				? this.basics.getDistinctAvailableColValues(SPECCOL)
				: [];
	}

	withFilter(colName: ColNames, values: Value[]){
		const tableName = this.findTableName(colName)!;
		let tables = tableNames.map(tName => {
			return tName === tableName
				? this.getTable(tName).withFilter(colName, values)
				: this.getTable(tName)
		});

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

	withOriginsTable(origins: JsonCompositeSpecTable['origins'] | CompositeSpecTable['origins']){
		const newOrigins = new SpecTable(origins.colNames as Col<OriginsColNames>[], origins.rows, this.origins.filters);
		const originSpecs = newOrigins.getDistinctColValues(SPECCOL);
		const extraFilter = originSpecs.length >= this.basics.specsCount ? [] : originSpecs;

		return new CompositeSpecTable(
			this.basics.withExtraSpecFilter(extraFilter),
			this.columnMeta.withExtraSpecFilter(extraFilter),
			newOrigins
		);
	}

	getFilter(colName: ColNames): Value[] {
		return this.findTable(colName).getFilter(colName);
	}

	getDistinctAvailableColValues(colName: ColNames){
		return this.findTable(colName).getDistinctAvailableColValues(colName);
	}

	getAllDistinctAvailableColValues(colName: ColNames){
		const table = this.findTable(colName);
		return table
			? table.getAllColValues(colName)
			: [];
	}

	getColumnValuesFilter(colName: ColNames){
		return this.findTable(colName).getColumnValuesFilter(colName);
	}

	getColLabelNamePair(colName: ColNames): ColNameLabels{
		return labelColNameMapper[colName] ? [colName, labelColNameMapper[colName]] : [colName, colName];
	}

	getLabelName(colName: ColNames){
		return labelColNameMapper[colName] ? labelColNameMapper[colName] : colName;
	}

	getLabelFilter(colName: ColNames){
		const columnValues = this.getFilter(colName);
		const labelName = this.getLabelName(colName);

		if (colName === labelName) {
			return columnValues;
		} else {
			const rows = this.findTable(colName).rows;

			return columnValues.map(val => {
				const row = rows.find((row) => val === row[colName]);
				return row ? row[labelName] : undefined;
			});
		}
	}
}
