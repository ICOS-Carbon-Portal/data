import {TableFormat, BinTable, ColumnInfo} from 'icos-cp-backend';

type Indices = {
	date: number
	latitude: number
	longitude: number
	data: number[]
}

const flagColumnsFormat = 'http://meta.icos-cp.eu/ontologies/cpmeta/bmpChar';

export default class BinTableData{
	readonly indices: Indices;
	
	constructor(readonly tableFormat: TableFormat, private binTable: BinTable){
		this.indices = this._getIndices(tableFormat);
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
		const specialColNames = ['TIMESTAMP'];
		const [dateIdx, latitudeIdx, longitudeIdx] = specialColNames.map(colName => tableFormat.getColumnIndex(colName));
		const dataIndices = tableFormat.columns.reduce<number[]>((acc, curr, idx) => {
			if (
				!specialColNames.includes(curr.name) &&
				curr.valueFormat != flagColumnsFormat
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

	get isValidData(){
		const indices = this.indices;
		return indices.date >= 0 && indices.latitude >= 0 && indices.longitude >= 0 && indices.data.length > 0;
	}

	withBinTable(binTable: BinTable){
		return new BinTableData(this.tableFormat, binTable);
	}

	data(columnsArr: number[]){
		return this.binTable.values(columnsArr, r => r);
	}

	get allData(){
		return this.data(Array.from({length: this.tableFormat.columns.length}, (_, i) => i));
	}


	get columnsInfo(): ReadonlyArray<ColumnInfo>{
		return this.tableFormat.columns;
	}

	get dataColumnsInfo(){
		return this.indices.data.map(idx => this.column(idx));
	}

	column(idx: number){
		return this.tableFormat.columns[idx];
	}

	getColumnIndex(colName: string){
		return this.tableFormat.getColumnIndex(colName);
	}

	dataIdx2ValueIdx(idx: number){
		return this.indices.data[idx];
	}

	valueIdx2DataIdx(idx: number){
		return this.indices.data.findIndex(d => d === idx);
	}

	getColumnIndexByLabel(colLabel: string){
		return this.tableFormat.columns.findIndex(col => col.label === colLabel);
	}

	get nRows(){
		return this.binTable.length;
	}
}