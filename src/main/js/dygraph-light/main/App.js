import {getTableFormatNrows, getBinTable} from './backend';

export default class App {
	constructor(config, params){
		this.config = config;
		this.params = params;
		this.graph = undefined;
		this.tableFormat = undefined;

		if (params.isValidParams) {
			this.main();
		} else {
			let errMsg = '<b>The request you made is not valid!</b>';
			errMsg += '<p>It must contain <i>objId</i>, <i>x</i> (parameter name for X-axel) and <i>y</i> (parameter name for Y-axel)</p>';

			presentError(errMsg);
		}
	}

	main(){
		const params = this.params;

		getTableFormatNrows(this.config, params.objId)
			.then(
				({tableFormat, nRows}) => {
					if(!isColNameValid(tableFormat, params.x))
						return fail(`Parameter x (${params.x}) does not exist in data`)
					else if(!isColNameValid(tableFormat, params.y))
						return fail(`Parameter y (${params.y}) does not exist in data`)
					else {
						this.initGraph(tableFormat);
						this.tableFormat = tableFormat;
						return {tableFormat, nRows};
					}
				})
			.then(
				({tableFormat, nRows}) => {
					return getBinTable(params.x, params.y, params.objId, tableFormat, nRows);
				})
			.then(
				this.drawGraph.bind(this),
				err => {
					console.log(err);
					presentError(err.message);
				}
			);
	}

	initGraph(tableFormat){
		const params = this.params;

		const xlabel = getColInfoParam(tableFormat, params.x, 'label');
		const ylabel = getColInfoParam(tableFormat, params.y, 'label');
		const labels = [xlabel, ylabel];

		const valueFormatX = getColInfoParam(tableFormat, params.x, 'valueFormat');
		const valueFormatter = isTimestamp(valueFormatX)
			? (ms) => toISOString(ms)
			: (val) => `<span style="font-weight: bold; color: rgb(0,128,128);">${xlabel}</span>: ${val}`;

		const drawPoints = params.type === 'scatter';

		this.graph = new Dygraph(
			'graph',
			[[0,0]],
			{
				strokeWidth: 0,
				drawPoints,
				axisLabelWidth: 70,
				legend: 'always',
				labelsDiv: 'legend',
				labelsSeparateLines: false,
				labels,
				connectSeparatedPoints: true,
				labelsKMB: true,
				digitsAfterDecimal: 4,
				axes: {
					x: {
						drawGrid: false,
						valueFormatter: valueFormatter
					},
					y: {
						axisLabelWidth: 65
					}
				}
			}
		);
	}

	drawGraph(binTable){
		const valueFormatX = getColInfoParam(this.tableFormat, this.params.x, 'valueFormat');
		const data = isTimestamp(valueFormatX)
			? binTable.chartValues(0, 1).filter(cv => cv.x !== 0).map(cv => [new Date(cv.x), cv.y])
			: binTable.chartValues(0, 1).map(cv => [cv.x, cv.y]);
		const strokeWidth = this.params.type === 'scatter'
			? 0
			: 1;
		this.graph.updateOptions( { file: data, strokeWidth } );
	}
}

function isTimestamp(valueFormat){
	return valueFormat === 'http://meta.icos-cp.eu/ontologies/cpmeta/iso8601dateTime';
}

function isColNameValid(tableFormat, colName){
	return tableFormat.getColumnIndex(colName) >= 0;
}

function getColInfoParam(tableFormat, colName, param){
	return tableFormat.columns(tableFormat.getColumnIndex(colName))[param];
}

function toISOString(ms){
	const date = new Date(ms);

	function pad(number) {
		if (number < 10) {
			return '0' + number;
		}
		return number;
	}

	return date.getUTCFullYear() +
		'-' + pad(date.getUTCMonth() + 1) +
		'-' + pad(date.getUTCDate()) +
		' ' + pad(date.getUTCHours()) +
		':' + pad(date.getUTCMinutes()) +
		':' + pad(date.getUTCSeconds());
}

function fail(message){
	return Promise.reject(new Error(message));
}

function presentError(errMsg){
	document.getElementById('error').innerHTML = errMsg;
}
