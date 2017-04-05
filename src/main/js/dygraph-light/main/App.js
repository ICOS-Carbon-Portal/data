import {getTableFormatNrows, getBinTable} from './backend';
import Dygraph from 'dygraphs';

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

			document.getElementById('error').innerHTML = errMsg;
		}
	}

	main(){
		this.getData();
	}

	getData(){
		const params = this.params;

		getTableFormatNrows(this.config, params.objId)
			.then(
				({tableFormat, nRows}) => {
					this.initGraph(tableFormat);
					this.tableFormat = tableFormat;
					return {tableFormat, nRows};
				})
			.then(
				({tableFormat, nRows}) => {
					return getBinTable(params.x, params.y, params.objId, tableFormat, nRows);
				})
			.then(
				binTable => {
					this.drawGraph(binTable),
					err => {console.log(err);}
				}
			);
	}

	initGraph(tableFormat){
		const valueFormatX = getColInfoParam(tableFormat, this.params.x, 'valueFormat');
		const valueFormatter = valueFormatX === 'http://meta.icos-cp.eu/ontologies/cpmeta/iso8601dateTime'
			? (ms) => {return '<b></b>' + toISOString(ms);}
			: (val) => val;

		const ylabel = getColInfoParam(tableFormat, this.params.y, 'label');
		const labels = ['Date', ylabel];

		this.graph = new Dygraph(
			'graph',
			[[1,1]],
			{
				strokeWidth: 0,
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
		const data = valueFormatX === 'http://meta.icos-cp.eu/ontologies/cpmeta/iso8601dateTime'
			? binTable.chartValues(0, 1).map(cv => [new Date(cv.x), cv.y])
			: binTable.chartValues(0, 1).map(cv => [cv.x, cv.y]);
console.log({tableFormat: this.tableFormat, chartValues: binTable.chartValues(0, 1), data});
		this.graph.updateOptions( { file: data, strokeWidth: 1 } );
	}
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