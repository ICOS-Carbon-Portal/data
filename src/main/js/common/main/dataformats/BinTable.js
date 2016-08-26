'use strict';

function dataTypeSize(dtype){
	switch (dtype){
		case 'DOUBLE': return 8;
		case 'BYTE': return 1;
		case 'CHAR': return 2;
		case 'SHORT': return 2;
		default: return 4;
	}
}

function getColumnSizes(schema){
	return schema.columns.map(dtype => dataTypeSize(dtype) * schema.size);
}

function getColumnOffsets(schema){
	return getColumnSizes(schema).reduce((acc, colSize) => {
		let lastSize = acc[acc.length - 1];
		let newSize = lastSize + colSize;
		return acc.concat(newSize);
	}, [0]);
}

function dtypeToAccessor(dtype, view){
	switch (dtype){
		case 'DOUBLE': return i => view.getFloat64(i * 8, false);
		case 'FLOAT': return i => view.getFloat32(i * 4, false);
		case 'INT': return i => view.getInt32(i * 4, false);
		case 'BYTE': return i => view.getInt8(i, false);
		case 'CHAR': return i => String.fromCharCode(view.getUint16(i * 2, false));
		case 'SHORT': return i => view.getInt16(i * 2, false);
		case 'STRING': throw new Error('String columns in BinTables are not supported at the moment.');
		default: throw new Error('Unsupported data type: ' + dtype);
	}
}

class Column{
	constructor(arrBuff, offset, length, dtype){
		const valLength = dataTypeSize(dtype);
		const view = new DataView(arrBuff, offset, length * valLength);
		this._length = length;
		this._accessor = dtypeToAccessor(dtype, view);
	}

	get length(){
		return this._length;
	}

	value(i){
		return this._accessor(i);
	}
}

export default class BinTable{

	constructor(arrBuff, schema){
		this._length = schema.size;

		let columnOffsets = getColumnOffsets(schema);

		this._columns = schema.columns.map(
			(dtype, i) => new Column(arrBuff, columnOffsets[i], schema.size, dtype)
		);
	}

	get nCols(){
		return this._columns.length;
	}

	get length(){
		return this._length;
	}

	column(i){
		return this._columns[i];
	}

	row(i){
		return this._columns.map(col => col.value(i));
	}

	value(row, column){
		return this._columns[column].value(row);
	}

	chartValues(xCol, yCol){
		return Array.from({length: this._length}, (_, i) => {
			return {x: this.value(i, xCol), y: this.value(i, yCol)};
		});
	}

	static get empty(){
		return new BinTable(null, {columns: [], size: 0}, []);
	}
};

