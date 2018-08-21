import 'babel-polyfill';
import {getTableFormatNrows, getBinTable} from './backend';
import {saveToRestheart} from '../../common/main/backend';


const spinnerDelay = 100;

export default class App {
	constructor(config, params){
		this.config = config;
		this.params = params;
		this.graph = undefined;
		this.tableFormat = undefined;
		this.labels = [];

		if (params.isValidParams) {
			this.main();
		} else {
			let errMsg = '<b>The request you made is not valid!</b>';
			errMsg += '<p>It must contain these parameters: ' + this.params.required.join(', ') + '</p>';
			errMsg += '<p>The request is missing these parameters: ' + params.missingParams.join(', ') + '.</p>';

			presentError(errMsg);
		}
	}

	main(){
		const params = this.params;
		saveToRestheart(formatData(params));

		const ids = params.get('objId').split(',');

		return getTableFormatNrows(this.config, ids)
		.then(
			([tableFormat, objects]) => {
				if(!isColNameValid(tableFormat, params.get('x')))
					return fail(`Parameter x (${params.get('x')}) does not exist in data`);
				else if(!isColNameValid(tableFormat, params.get('y')))
					return fail(`Parameter y (${params.get('y')}) does not exist in data`);
				else {
					if (typeof this.graph === "undefined") {
						this.initGraph(tableFormat);
						this.tableFormat = tableFormat;
						this.labels.push(getColInfoParam(tableFormat, params.get('x'), 'label'));
					}
					objects.map(object => {
						const filename = object.filename;
						const yLabel = `${filename.slice(0, filename.lastIndexOf('.'))}, ${params.get('y')}`;
						this.labels.push(yLabel);
					})
					return [tableFormat, objects];
				}
			}
		)
		.then(
			([tableFormat, objects]) => {
				return Promise.all(
					objects.map(object =>
						getBinTable(params.get('x'), params.get('y'), object.id, tableFormat, object.nRows))
				)
			}
		)
		.then(binTables => {
			if (binTables.length > 1 && params.get('linking') !== 'concatenate') {
				this.graph.updateOptions( { labels: this.labels } );
			}
			this.drawGraph(binTables)
		})
		.catch(err => {
			this.showSpinner(false);
			presentError(err.message);
		});
	}

	initGraph(tableFormat){
		this.showSpinner(true);

		const params = this.params;
		const xlabel = getColInfoParam(tableFormat, params.get('x'), 'label');
		const ylabel = getYLabel(tableFormat, params.get('y'));
		const labels = getLabels(xlabel, ylabel, params);
		const valueFormatX = getColInfoParam(tableFormat, params.get('x'), 'valueFormat');
		const formatters = getFormatters(xlabel, valueFormatX);
		const drawPoints = params.get('type') !== 'line';

		this.graph = new Dygraph(
			'graph',
			[Array(labels.length).fill(0)],
			{
				strokeWidth: 0,
				drawPoints,
				legend: 'always',
				labelsDiv: 'legend',
				labelsSeparateLines: false,
				xlabel,
				ylabel,
				labels: labels,
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

	drawGraph(binTables){
		const data = () => {
			if (this.params.get('linking') === 'concatenate') {
				// Concatenation
				const valueFormatX = getColInfoParam(this.tableFormat, this.params.get('x'), 'valueFormat');
				return isTimestamp(valueFormatX)
					? binTables.flatMap(binTable => binTable.values([0, 1], (subrow) => [new Date(subrow[0]), subrow[1]]))
					: binTables.flatMap(binTable => binTable.values([0, 1], subrow => subrow)
				).sort((d1, d2) => d1[0] - d2[0]);
			} else {
				// Overlap
				const dates = binTables.flatMap(binTable => binTable.values([0], v => v[0]));
				const uniqueDates = [...new Set([].concat(...dates))];
				let dateList = new Map(uniqueDates.map(i => [i, Array(binTables.length).fill(NaN)]));

				binTables.map((binTable, index) => {
					binTable.values([0, 1], subrow => {
						let v = dateList.get(subrow[0]);
						v[index] = subrow[1];
						dateList.set(subrow[0], v);
					});
				});

				return Array.from(dateList).map(k => k.flatten()).sort((d1, d2) => d1[0] - d2[0]);
			}
		}

		const strokeWidth = this.params.get('type') !== 'line' ? 0 : 1;

		this.graph.updateOptions( { file: data, strokeWidth } );
		this.showSpinner(false);
	}

	showSpinner(show){
		if (show) {
			this.timer = setTimeout(() => document.getElementById('cp-spinner').style.display = 'inline', spinnerDelay);
		} else {
			clearTimeout(this.timer);
			document.getElementById('cp-spinner').style.display = 'none';
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

const getYLabel = (tableFormat, colName) => {
	const unit = getColInfoParam(tableFormat, colName, 'unit');
	const label = getColInfoParam(tableFormat, colName, 'label');
	return unit != '?' ? `${label}, ${unit}` : label;
}

const getLabels = (xlabel, ylabel, params) => {
	const ids = params.get('objId').split(',');

	if (params.get('linking') !== 'concatenate' && ids.length > 1) {
		return [xlabel, ...ids];
	} else {
		return [xlabel, ylabel];
	}
}

const fail = (message) => {
	return Promise.reject(new Error(message));
};

const presentError = (errMsg) => {
	document.getElementById('cp-spinner').style.display = 'none';
	document.getElementById('error').style.display = 'flex';
	document.getElementById('error').innerHTML = errMsg;
};

const formatData = dataToSave => {
	return {
		previewTimeserie: {
			params: {
				objId: dataToSave.get('objId'),
				x: dataToSave.get('x'),
				y: dataToSave.get('y'),
				type: dataToSave.get('type')
			}
		}
	}
};
