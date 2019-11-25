import config from '../config';
import {TableFormat, BinTable, ColumnInfo} from 'icos-cp-backend';

type Indices = {
	date: number
	latitude: number
	longitude: number
	data: number[]
}

export default class BinTableData{
	readonly _indices: Indices
	constructor(readonly _tableFormat: TableFormat, readonly _binTable: BinTable){
		this._indices = this._getIndices(_tableFormat);
	}

	_getIndices(tableFormat: TableFormat): Indices{
		if (tableFormat === undefined) {
			return {
				date: -1,
				latitude: -1,
				longitude: -1,
				data: [],
			};
		}
		const specialColNames = [config.dateColName, config.latitudeColName, config.longitudeColName];
		const [dateIdx, latitudeIdx, longitudeIdx] = specialColNames.map(i => tableFormat.getColumnIndex(i));
		const dataIndices = tableFormat.columns.reduce<number[]>((acc, curr, idx) => {
			if (
				!specialColNames.includes(curr.name) &&
				curr.valueFormat != config.flagColumnsFormat
			) acc.push(idx);
			return acc;
		}, []);

		return {
			date: dateIdx,
			latitude: latitudeIdx,
			longitude: longitudeIdx,
			data: dataIndices,
		};
	}

	get indices(){
		return this._indices;
	}

	get isValidData(){
		const indices = this._indices;
		return indices.date >= 0 && indices.latitude >= 0 && indices.longitude >= 0 && indices.data.length > 0;
	}

	withBinTable(binTable: BinTable){
		return new BinTableData(this._tableFormat, binTable);
	}

	data(columnsArr: number[]){
		return this._binTable.values(columnsArr, r => r);
	}

	get allData(){
		return this.data(Array.from({length: this._tableFormat.columns.length}, (_, i) => i));
	}


	get columnsInfo(): ReadonlyArray<ColumnInfo>{
		return this._tableFormat.columns;
	}

	get dataColumnsInfo(){
		return this.indices.data.map(idx => this.column(idx));
	}

	column(idx: number){
		return this._tableFormat.columns[idx];
	}

	getColumnIndex(colName: string){
		return this._tableFormat.getColumnIndex(colName);
	}

	dataIdx2ValueIdx(idx: number){
		return this.indices.data[idx];
	}

	valueIdx2DataIdx(idx: number){
		return this.indices.data.findIndex(d => d === idx);
	}

	getColumnIndexByLabel(colLabel: string){
		return this._tableFormat.columns.findIndex(col => col.label === colLabel);
	}

	get nRows(){
		return this._binTable.length;
	}
}