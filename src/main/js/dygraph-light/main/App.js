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
		const formatters = getFormatters(xlabel, valueFormatX);
		const drawPoints = params.type !== 'line';

		console.log({tableFormat, formatters});

		this.graph = new Dygraph(
			'graph',
			[[0,0]],
			{
				strokeWidth: 0,
				drawPoints,
				legend: 'always',
				labelsDiv: 'legend',
				labelsSeparateLines: false,
				ylabel,
				labels,
				connectSeparatedPoints: true,
				labelsKMB: true,
				digitsAfterDecimal: 4,
				axes: {
					x: {
						drawGrid: false,
						axisLabelWidth: 80,
						valueFormatter: formatters.valueFormatter,
						axisLabelFormatter: formatters.axisLabelFormatter
					},
					y: {
						axisLabelWidth: 100
					}
				}
			}
		);
	}

	drawGraph(binTable){
		const valueFormatX = getColInfoParam(this.tableFormat, this.params.x, 'valueFormat');
		const data = isTimestamp(valueFormatX)
			? binTable.chartValsTimeserie(0, 1).filter(cv => cv.x !== 0)
			: binTable.chartValsArr(0, 1).filter(cv => cv.x !== 0);
		const strokeWidth = this.params.type !== 'line'
			? 0
			: 1;

		this.graph.updateOptions( { file: data, strokeWidth } );
	}
}

const getFormatters = (xlabel, valueFormatX) => {
	console.log(xlabel, valueFormatX);

	const formatLbl = (val) => {
		return `<span style="font-weight: bold; color: rgb(0,128,128);">${xlabel}</span>: ${val}`
	};

	const parseDatetime = (converter, format, func) => {
		const pad = (number) => {
			if (number < 10) {
				return '0' + number;
			}
			return number;
		};

		return (timeUnit) => {
			const fn = func ? func : (val) => val;
			const date = new Date(converter * timeUnit);

			switch(format){
				case "datetime":
					return date.getUTCFullYear() +
						'-' + pad(date.getUTCMonth() + 1) +
						'-' + pad(date.getUTCDate()) +
						' ' + pad(date.getUTCHours()) +
						':' + pad(date.getUTCMinutes()) +
						':' + pad(date.getUTCSeconds());

				case "date":
					return fn(date.getUTCFullYear() +
						'-' + pad(date.getUTCMonth() + 1) +
						'-' + pad(date.getUTCDate()));

				case "hms":
					return fn(pad(date.getUTCHours()) +
						':' + pad(date.getUTCMinutes()) +
						':' + pad(date.getUTCSeconds()));

				case "hm":
					return fn(pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()));
			}
		}
	};

	switch (valueFormatX) {

		case 'http://meta.icos-cp.eu/ontologies/cpmeta/iso8601dateTime':
			return {valueFormatter: parseDatetime(1, "datetime"), axisLabelFormatter: parseDatetime(1, "date")};

		case 'http://meta.icos-cp.eu/ontologies/cpmeta/iso8601date':
			const days2ms = 24 * 3600 * 1000;
			return {valueFormatter: parseDatetime(days2ms, "date", formatLbl), axisLabelFormatter: parseDatetime(days2ms, "date")};

		case "http://meta.icos-cp.eu/ontologies/cpmeta/iso8601timeOfDay":
			const sec2ms = 1000;
			return {valueFormatter: parseDatetime(sec2ms, "hms", formatLbl), axisLabelFormatter: parseDatetime(sec2ms, "hm")};

		default:
			return {valueFormatter: formatLbl, axisLabelFormatter: (val) => val};
	}
}

function formatValues(xlabel, valueFormatX){
	function regular(xlabel, val){


		return `<span style="font-weight: bold; color: rgb(0,128,128);">${xlabel}</span>: ${val}`
	}

	switch(valueFormatX){
		case '':
			return toISOString;
		default:

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
