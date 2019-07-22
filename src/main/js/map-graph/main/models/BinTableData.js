import config from '../config';

export default class BinTableData{
	constructor(tableFormat, binTable){
		this._tableFormat = tableFormat;
		this._indices = this._getIndices(tableFormat);
		this._binTable = binTable;
	}

	_getIndices(tableFormat){
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
		const dataIndices = tableFormat._columnsInfo.reduce((acc, curr, idx) => {
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

	withBinTable(binTable){
		return new BinTableData(this._tableFormat, binTable);
	}

	data(columnsArr){
		return this._binTable.values(columnsArr, r => r);
	}

	get allData(){
		return this.data(Array.from({length: this._tableFormat._columnsInfo.length}, (_, i) => i));
	}


	get columnsInfo(){
		return this._tableFormat._columnsInfo;
	}

	get dataColumnsInfo(){
		return this.indices.data.map(idx => this.column(idx));
	}

	column(idx){
		return this._tableFormat.columns(idx);
	}

	getColumnIndex(colName){
		return this._tableFormat.getColumnIndex(colName);
	}

	dataIdx2ValueIdx(idx){
		return this.indices.data[idx];
	}

	valueIdx2DataIdx(idx){
		return this.indices.data.findIndex(d => d === idx);
	}

	getColumnIndexByLabel(colLabel){
		return this._tableFormat._columnsInfo.findIndex(col => col.label === colLabel);
	}

	get nRows(){
		return this._binTable.length;
	}
}