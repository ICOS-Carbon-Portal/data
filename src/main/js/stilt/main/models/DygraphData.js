
export function wdcggBinTableToDygraphData(binTable, series){
	function rowGetter(i){
		var row = binTable.row(i);
		row[0] = new Date(row[0]);
		return row;
	}
	return new DygraphData(rowGetter, binTable.length, series);
}

const NAN = {};//local tailor-made not-a-number

export default class DygraphData{

	constructor(rowGetter, length, series){
		this.row = rowGetter;
		this.length = length;
		this.series = series;
	}

	withId(id){
		this.id = id;
		return this;
	}

	getData(){
		return Array.from({length: this.length}, (_, i) => this.row(i));
	}

	get nCols(){
		return this.series.length;
	}

	static merge(){
		const datas = Array.from(arguments);

		const series = datas
			.map(data => data.series)
			.reduce((acc, series) => acc.concat(series.slice(1)));

		const iters = datas.map(data => new DygraphIter(data));

		const finalData = [];

		for(let x = minX(iters); compareX(x, NAN) < 0; x = minX(iters)){
			const row = [x];
			iters.forEach(iter => pushTail(row, iter.getRow(x)));
			finalData.push(row);
		}

		return new ArrayBasedDygraphData(finalData, series);
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
			return Array.from({length: this.data.nCols}, () => null);
		}
	}
}

class ArrayBasedDygraphData extends DygraphData{
	constructor(rowsArr, series){
		super(i => rowsArr[i], rowsArr.length, series);
		this._rowsArr = rowsArr;
	}

	getData(){
		return this._rowsArr;
	}
}

//NAN is greater than anything else except another NAN
//otherwise, standard comparison using < and > operators
function compareX(x1, x2){
	return x1 === NAN ? x2 === NAN ? 0 : 1 : x2 === NAN ? -1 : x1 > x2 ? 1 : x1 < x2 ? -1 : 0;
}

function minX(dygraphIters){
	return dygraphIters.reduce((minSoFar, iter) => {
		const x = iter.x;
		return compareX(minSoFar, x) < 0 ? minSoFar : x;
	}, NAN);
}

function pushTail(target, source){
	for(let i = 1; i < source.length; i++){
		target.push(source[i]);
	}
}

