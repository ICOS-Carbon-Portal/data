import {getTableFormatNrows, getBinTable} from './backend';

const spinnerDelay = 400;

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

		getTableFormatNrows(this.config, params.get('objId'))
			.then(
				({tableFormat, nRows}) => {
					if(!isColNameValid(tableFormat, params.get('x')))
						return fail(`Parameter x (${params.get('x')}) does not exist in data`)
					else if(!isColNameValid(tableFormat, params.get('y')))
						return fail(`Parameter y (${params.get('y')}) does not exist in data`)
					else {
						this.initGraph(tableFormat);
						this.tableFormat = tableFormat;
						return {tableFormat, nRows};
					}
				})
			.then(
				({tableFormat, nRows}) => {
					return getBinTable(params.get('x'), params.get('y'), params.get('objId'), tableFormat, nRows);
				})
			.then(
				this.drawGraph.bind(this),
				err => {
					this.showSpinner(false);
					console.log(err);
					presentError(err.message);
				}
			);
	}

	initGraph(tableFormat){
		this.showSpinner(true);
		const params = this.params;

		const xlabel = getColInfoParam(tableFormat, params.get('x'), 'label');
		const ylabel = getColInfoParam(tableFormat, params.get('y'), 'label');

		const valueFormatX = getColInfoParam(tableFormat, params.get('x'), 'valueFormat');
		const formatters = getFormatters(xlabel, valueFormatX);
		const drawPoints = params.get('type') !== 'line';

		this.graph = new Dygraph(
			'graph',
			[[0,0]],
			{
				strokeWidth: 0,
				drawPoints,
				legend: 'always',
				labelsDiv: 'legend',
				labelsSeparateLines: false,
				xlabel,
				ylabel,
				labels: [xlabel, ylabel],
				xRangePad: 5,
				connectSeparatedPoints: true,
				labelsKMB: true,
				digitsAfterDecimal: 4,
				axes: {
					x: {
						drawGrid: false,
						axisLabelWidth: 80,
						valueFormatter: formatters.valueFormatter,
						axisLabelFormatter: formatters.axisLabelFormatter,
						pixelsPerLabel: 100
					},
					y: {
						axisLabelWidth: 100
					}
				}
			}
		);
	}

	drawGraph(binTable){
		const valueFormatX = getColInfoParam(this.tableFormat, this.params.get('x'), 'valueFormat');
		const data = isTimestamp(valueFormatX)
			? binTable.chartValsTimeserie(0, 1).filter(cv => cv.x !== 0)
			: binTable.chartValsArr(0, 1).filter(cv => cv.x !== 0);
		const strokeWidth = this.params.get('type') !== 'line'
			? 0
			: 1;

		this.graph.updateOptions( { file: data, strokeWidth } );
		this.showSpinner(false);
	}

	showSpinner(show){
		if (show) {
			this.timer = setTimeout(() => document.getElementById('loading').style.display = 'inline', spinnerDelay);
		} else {
			clearTimeout(this.timer);
			document.getElementById('loading').style.display = 'none';
		}
	}
}

const getFormatters = (xlabel, valueFormatX) => {
	const formatLbl = (val) => {
		return `<span style="font-weight: bold; color: rgb(0,128,128);">${xlabel}</span>: ${val}`
	};

	const parseDatetime = (converter, format, func) => {
		const pad = (number) => {
			return number < 10 ? '0' + number : number;
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

				default:
					return fn(timeUnit);
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
};

const isTimestamp = (valueFormat) => {
	return valueFormat === 'http://meta.icos-cp.eu/ontologies/cpmeta/iso8601dateTime';
};

const isColNameValid = (tableFormat, colName) => {
	return tableFormat.getColumnIndex(colName) >= 0;
};

const getColInfoParam = (tableFormat, colName, param) => {
	return tableFormat.columns(tableFormat.getColumnIndex(colName))[param];
};

const fail = (message) => {
	return Promise.reject(new Error(message));
};

const presentError = (errMsg) => {
	document.getElementById('error').innerHTML = errMsg;
};
