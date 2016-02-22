'use strict';


function dataTypeSize(dtype){
	switch (dtype){
		case 'DOUBLE': return 8;
		case 'LONG': return 8;
		case 'BYTE': return 1;
		case 'CHAR': return 1;
		default: return 4;
	}
}

function columnSizes(schema){
	return schema.columns.map(dtype => dataTypeSize(dtype) * schema.size);
}

function columnOffsets(schema){
	return columnSizes(schema).reduce((acc, colSize) => {
		let lastSize = acc[acc.length - 1];
		let newSize = lastSize + colSize;
		return acc.concat(newSize);
	}, [0]);
}

class IntColumn{
	constructor(arrBuff, offset, length){
		this._view = new DataView(arrBuff, offset, length * 4);
		this._length = length;
	}

	value(i){
		return this._view.getInt32(i * 4, false); //big endian byte order expected
	};

	get length(){
		return this._length;
	}

}

function getColumn(arrBuff, offset, length, dtype){
	switch (dtype){
		case 'INT': return new IntColumn(arrBuff, offset, length);
		default: throw new Error('Unsupported data type: ' + dtype);
	}
}

export default class BinTable{

	constructor(arrBuff, schema, columnNumbers){
		this._arrBuff = arrBuff;
		this._length = schema.size;

		let colOffsets = columnOffsets(schema);

		this._columns = columnNumbers.map((colNum, i) => {
			let dtype = schema.columns[colNum];
			let offset = colOffsets[colNum];
			return getColumn(arrBuff, offset, schema.size, dtype);
		});
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
};

