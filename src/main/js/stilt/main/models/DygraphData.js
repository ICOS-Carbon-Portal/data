
export function wdcggBinTableToDygraphData(binTable, labels){
	function rowGetter(i){
		var row = binTable.row(i);
		row[0] = new Date(row[0]);
		return row;
	}
	return new DygraphData(rowGetter, binTable.length, labels);
}

const NAN = {};

export default class DygraphData{

	constructor(rowGetter, length, labels){
		this.row = rowGetter;
		this.length = length;
		this.nCols = labels.length;
		this.labels = labels;
	}

	getData(){
		return Array.from({length: this.length}, (_, i) => this.row(i));
	}

	static merge(){
		const datas = Array.from(arguments);

		const labels = datas
			.map(data => data.labels)
			.reduce((acc, labels) => acc.concat(labels.slice(1)));

		const iters = datas.map(data => new DygraphIter(data));

		const finalData = [];

		var x = minX(iters);

		while(compareX(x, NAN) < 0){
			const row = [x];

			iters.forEach(iter => {
				const rowPart = iter.getRow(x);
				for(let i = 1; i < rowPart.length; i++){ row.push(rowPart[i]);}
			});
			finalData.push(row);
			x = minX(iters);
		}

		return new ArrayBasedDygraphData(finalData, labels);
	}
}

class DygraphIter{
	constructor(data){
		this.data = data;
		this.i = 0;
	}

	get x(){
		return this.i < this.data.length
			? this.data.row(this.i)[0]
			: NAN;
	}

	getRow(x){
		if(compareX(this.x, x) === 0){
			const row = this.data.row(this.i);
			this.i++;
			return row;
		} else{
			return Array.from({length: this.data.labels.length}, () => null);
		}
	}
}

class ArrayBasedDygraphData extends DygraphData{
	constructor(rowsArr, labels){
		super(i => rowsArr[i], rowsArr.length, labels);
		this._rowsArr = rowsArr;
	}

	getData(){
		return this._rowsArr;
	}
}

function compareX(x1, x2){
	return x1 === NAN ? x2 === NAN ? 0 : 1 : x2 === NAN ? -1 : x1 > x2 ? 1 : x1 < x2 ? -1 : 0;
}

function minX(dygraphIters){
	return dygraphIters.reduce((acc, iter) => {
		const x = iter.x;
		return compareX(acc, x) < 0 ? acc : x;
	}, NAN);
}


