import 'babel-polyfill';
import {getTableFormatNrows, getBinTable} from './backend';
import {logError, saveToRestheart} from '../../common/main/backend';
import UrlSearchParams from '../../common/main/models/UrlSearchParams';
import config from '../../common/main/config';
import Dygraph from 'dygraphs';
import './Dygraphs.css';
import './custom.css';
import CollapsibleSection from './CollapsibleSection';
import {Spinner} from 'icos-cp-spinner';
import {getCssText} from '../../common/main/style';
import {addHelpSection} from "./HelpSection";
import {BinTable, ColumnInfo, TableFormat} from "icos-cp-backend";
import {ColumnDataType} from "icos-cp-backend/lib/BinTable";

type IdxSig<Value = string, Keys extends string | number | symbol = string> = {
	[Key in Keys]: Value
}

function isDefined<T>(x: T | undefined): x is T{
	return x !== undefined;
}

const spinnerDelay = 100;
const errMsg = `
<div>
	<h2>Invalid request</h2>

	<div style="font-weight:bold;">Required parameters:</div>
	<ul style="margin:0;">
		<li>objId: List (comma separated) of data object ids.</li>
		<li>x: Parameter name for X axis.</li>
		<li>y: Parameter name for Y axis.</li>
	</ul>

	<div style="font-weight:bold;margin-top:30px;">Optional parameters:</div>
	<ul style="margin:0;">
		<li>linking: Defaults to <i>overlap</i>. Use <i>concatenate</i> to display data objects as one series.</li>
		<li>legendLabels: List (comma separated matching order of objId) of labels for legend. Defaults to file name.</li>
		<li>legendClosed: Start with legend collapsed. Defaults to legend open.</li>
	</ul>

	<div style="margin-top:30px;">
		<a href="?objId=-xQ2wgAt-ZjdGaCEJnKQIEIu,0EwfR9LutvnBbvgW-KJdq2U0&x=TIMESTAMP&linking=overlap&y=co2&legendLabels=HPB 93.0,SMR 67.2&legendClosed">Example</a>
	</div>
</div>`;

const stylesCollapsibleSection = {
	details: getCssText({
		position: 'absolute',
		zIndex: 9999,
		backgroundColor: 'white',
		border: '1px solid black',
		padding: 5,
		borderRadius: 5,
		boxShadow: '9px 8px 20px -18px rgba(0,0,0,0.75)'
	}),
	summary: getCssText({
		fontWeight: 'bold',
		cursor: 'pointer'
	}),
	anchor: getCssText({
		marginTop: 7
	})
};

export default class App {
	private graph: any;
	private tableFormat: any;
	private labels: any;
	private lastDateFormat: any;
	private isHelpAdded: boolean;
	private spinner: any;
	private legend: CollapsibleSection;
	private timer: number = 0;

	constructor(readonly config: any, private params: UrlSearchParams){
		// this.config = config;
		// this.params = params;
		this.graph = undefined;
		this.tableFormat = undefined;
		this.labels = [];
		this.lastDateFormat = '';
		this.isHelpAdded = false;

		const isSites = config.envri === "SITES";
		this.spinner = new Spinner(isSites);

		if (window.frameElement) {
			this.showSpinner(false);
			if (params.isValidParams) this.main();

			window.onmessage = (event: MessageEvent) => {
				const urlParams = new URL(event.data).search;
				this.params = new UrlSearchParams(urlParams, ['objId', 'x', 'y']);
				if (this.params.isValidParams) {
					hideError();
					this.graph = undefined;
					this.labels = [];
					this.main();
				} else {
					presentError(`Please choose a value for ${this.params.missingParams.join(', ')}.`);
				}
			};
		} else {
			if (params.isValidParams) {
				this.main();
			} else {
				this.showSpinner(false);
				presentError(errMsg);
			}
		}

		this.legend = new CollapsibleSection('legend', 'Legend', stylesCollapsibleSection, this.params.get('legendClosed'), true);
	}

	main(){
		const params = this.params;
		saveToRestheart(formatData(params));

		const ids = params.get('objId').split(',');
		const legendLabels = params.has('legendLabels') ? params.get('legendLabels').split(',') : [];

		return getTableFormatNrows(this.config, ids)
			.then(
				(objects) => {
					const object = objects.find(object =>
						isColNameValid(object.tableFormat, params.get('x')) &&
						isColNameValid(object.tableFormat, params.get('y')));
					if (!object) {
						return fail(`Parameter x (${params.get('x')}) or parameter y (${params.get('y')}) does not exist in data`);
					} else {
						if (typeof this.graph === "undefined") {
							const specList = Array.from(new Set(objects.map(o => o.specLabel))).join(' / ');
							const title = `${specList} - ${params.get('y')}`;
							this.initGraph(object.tableFormat, title);
							this.tableFormat = object.tableFormat;
							this.labels.push(getColInfoParam(object.tableFormat, params.get('x'), 'label'));

							if (params.get('linking') === 'concatenate'){
								this.labels.push(params.has('legendLabels') && params.get('legendLabels').length
									? params.get('legendLabels').split(',')[0]
									: getLabel(object.tableFormat, params.get('y')));
							} else {
								objects.forEach((object, idx) => {
									const filename = object.filename;
									const yLabel = legendLabels.length > idx && legendLabels[idx].length > 0
										? legendLabels[idx]
										: filename.slice(0, filename.lastIndexOf('.'));
									this.labels.push(yLabel);
								});
							}
						}

						// Sort by date so that dygraph can display the time serie
						return objects.sort((obj1, obj2) =>
							new Date(obj1.startedAtTime).getTime() - new Date(obj2.startedAtTime).getTime());
					}
				}
			)
			.then(
				objects => {
					return Promise.all(
						objects.map(object =>
							isColNameValid(object.tableFormat, params.get('y'))
								? getBinTable(params.get('x'), params.get('y'), object.id, object.tableFormat, object.nRows)
								: Promise.resolve([] as any)
						)
					);
				}
			)
			.then(binTables => {
				if (binTables.length > 0) {
					this.graph.updateOptions({ labels: this.labels });
					this.drawGraph(binTables);
				}
			})
			.catch(err => {
				this.showSpinner(false);
				presentError(err.message);
			});
	}

	initGraph(tableFormat: TableFormat, title: string){
		this.showSpinner(true);

		const params = this.params;
		const xlabel = getLabel(tableFormat, params.get('x'));
		const ylabel = getLabel(tableFormat, params.get('y'));
		const labelCount = params.get('linking') === 'concatenate' ? 2 : params.get('objId').split(',').length + 1;
		const labels = Array(labelCount).fill('');
		const xLegendLabel = getColInfoParam(tableFormat, params.get('x'), 'label');
		const valueFormatX = getColInfoParam(tableFormat, params.get('x'), 'valueFormat');
		const xIsDate = isDate(valueFormatX) || isDateTime(valueFormatX) || isTime((valueFormatX));
		const formatters = getFormatters(xLegendLabel, valueFormatX);
		const drawPoints = params.get('type') !== 'line';

		let daysDisplayed = 0;
		const getDaysDisplayed = ([min, max]: number[]) => (max - min) / (24 * 3600 * 1000);

		this.graph = new Dygraph(
			'graph',
			[Array(labels.length).fill(0)],
			{
				title: title,
				strokeWidth: 0,
				drawPoints,
				legend: 'always',
				labelsDiv: 'legend',
				labelsSeparateLines: true,
				legendFormatter: this.legendFormatter,
				xlabel,
				ylabel,
				labels: labels,
				xRangePad: 5,
				connectSeparatedPoints: true,
				digitsAfterDecimal: 4,
				axes: {
					x: {
						drawGrid: false,
						axisLabelWidth: 80,
						valueFormatter: formatters.valueFormatter as ValueFormatter,
						axisLabelFormatter: formatters.axisLabelFormatter as AxisLabelFormatter,
						pixelsPerLabel: 100
					},
					y: {
						axisLabelWidth: 100
					}
				},
				drawCallback: (graph: any, isInitial: boolean) => {
					if (xIsDate && daysDisplayed === 0) {
						daysDisplayed = getDaysDisplayed(graph.xAxisRange());

						if (daysDisplayed > 0) {
							// Adjust x labels once when it has been filled with dates
							this.updateAxisLabelFormatter(xLegendLabel, valueFormatX, daysDisplayed);
						}
					}
				},
				zoomCallback: (min: number, max: number) => {
					if (xIsDate) {
						daysDisplayed = getDaysDisplayed([min, max]);
						this.updateAxisLabelFormatter(xLegendLabel, valueFormatX, daysDisplayed);
					}
				}
			}
		);
	}

	updateAxisLabelFormatter(xLegendLabel: string, valueFormatX: string, daysDisplayed: number){
		const currentDateTimeFormat = getDateTimeFormat(daysDisplayed);

		if (currentDateTimeFormat === this.lastDateFormat) return;

		if (valueFormatX.endsWith("iso8601dateTime")) {
			const {axisLabelFormatter} = getFormatters(xLegendLabel, valueFormatX, daysDisplayed);
			this.graph.updateOptions({axes: {x: {axisLabelFormatter}}});
			this.lastDateFormat = currentDateTimeFormat;
		}
	}

	legendFormatter(data: any){
		return `${data.x === undefined ? '' : data.xHTML}<br><table>` + data.series.map((series: any) =>
			`<tr style="color:${series.color}"><td>${series.labelHTML}:</td>` +
			`<td>${isNaN(series.yHTML) ? '' : series.yHTML}</td></tr>`
		).join('') + '</table>';
	}

	drawGraph(binTables: BinTable[]){
		let allXValsAreNaN = true;
		let allYValsAreNaN = true;

		const data = () => {
			if (this.params.get('linking') === 'concatenate') {
				// Concatenation
				const valueFormatX = getColInfoParam(this.tableFormat, this.params.get('x'), 'valueFormat');
				return isDateTime(valueFormatX)
					? binTables.flatMap(binTable => binTable.values([0, 1], (subrow) => {
						allXValsAreNaN = allXValsAreNaN && isNaN(subrow[0] as number);
						allYValsAreNaN = allYValsAreNaN && isNaN(subrow[1] as number);
						return [new Date(subrow[0]), subrow[1]];
					}))
					: binTables.flatMap(binTable => binTable.values([0, 1], subrow => {
						allXValsAreNaN = allXValsAreNaN && isNaN(subrow[0] as number);
						allYValsAreNaN = allYValsAreNaN && isNaN(subrow[1] as number);
						return subrow as number[];
					})).sort((d1, d2) => d1[0] - d2[0]);
			} else {
				// Overlap
				const dates = binTables.filter(binTable => binTable.length).flatMap(binTable => binTable.values([0], v => v[0])) as number[];
				const uniqueDates = Array.from(new Set(dates));
				let dateList = new Map(uniqueDates.map(i => [i, Array(binTables.length).fill(NaN)])) as Map<number, number[]>;

				binTables.map((binTable, index) => {
					binTable.values([0, 1], (subrow) => {
						let v = dateList.get(subrow[0] as number);
						if (v === undefined) throw new Error("Could not get subrow from dateList");

						v[index] = subrow[1] as number;
						allXValsAreNaN = allXValsAreNaN && isNaN(subrow[0] as number);
						allYValsAreNaN = allYValsAreNaN && isNaN(subrow[1] as number);
						dateList.set(subrow[0] as number, v);
					});
				});

				return Array.from(dateList).map(([k, v]) => [k].concat(v)).sort((d1, d2) => d1[0] - d2[0]);
			}
		};

		const strokeWidth = this.params.get('type') !== 'line' ? 0 : 1;

		this.graph.updateOptions( { file: data, strokeWidth } );
		this.showCollapsible();
		this.showSpinner(false);

		if (allXValsAreNaN && allYValsAreNaN) {
			presentError(`Selected columns (X: ${this.params.get('x')}, Y: ${this.params.get('y')}) does not contain any values`);

		} else if (allXValsAreNaN) {
			presentError(`Selected X column (${this.params.get('x')}) does not contain any values`);

		} else if (allYValsAreNaN) {
			presentError(`Selected Y column (${this.params.get('y')}) does not contain any values`);
		}
	}

	showCollapsible(){
		const xAxisRange = this.graph.xAxisExtremes();
		const xCoord = this.graph.toDomXCoord(xAxisRange[0]);
		const titleHeight = this.graph.getOption('titleHeight');
		const graphStyle = window.getComputedStyle(document.getElementById("graph")!);
		const top = parseInt(graphStyle.top);
		const left = parseInt(graphStyle.left);

		const posLegend = {
			top: top + titleHeight + 2,
			left: left + xCoord + 2
		};

		this.legend.setPosition(posLegend);
		this.legend.show();

		// Help section
		if (this.isHelpAdded) return;

		const collapsibleHelp = new CollapsibleSection('help', 'Help', stylesCollapsibleSection, false, false);
		collapsibleHelp.setPosition({top: posLegend.top, right: 10});

		addHelpSection(document.getElementById('help') as HTMLDivElement);
		this.isHelpAdded = true;
	}

	showSpinner(show: boolean){
		if (show) {
			this.timer = setTimeout(() => this.spinner.show(), spinnerDelay);
		} else {
			clearTimeout(this.timer);
			this.spinner.hide();
		}
	}
}

type AxisLabelFormatter = (
	(v: number | Date, granularity?: number, opts?: (name: string) => any, dygraph?: Dygraph) => string | any)
	| undefined

type ValueFormatter = (
	(v: number, opts?: (name: string) => any, seriesName?: string, dygraph?: Dygraph, row?: number, col?: number) => any)
	| undefined

const getFormatters = (xlabel: string, valueFormatX: string, daysDisplayed = Infinity) => {
	const formatLbl = (val: number) => {
		return `<span style="font-weight: bold; color: rgb(0,128,128);">${xlabel}</span>: ${val}`;
	};

	const pad = (num: number) => {
		return num < 10 ? '0' + num : num;
	};

	const valueFormatter = (converter: number, format: string, func?: Function): ValueFormatter => {
		const fn = func ? func : (val: any) => val;

		return (dataVal, opts, seriesName, graph, row, col) => {
			return parseDatetime(dataVal as number, new Date(converter as number * (dataVal as number)), format, fn);
		};
	};

	const axisLabelFormatter = (converter: number, format: ReturnType<typeof getDateTimeFormat>, func?: Function): AxisLabelFormatter => {
		const fn = func ? func : (val: any) => val;

		return (dataVal, granularity, opts, graph) => {
			return parseDatetime(dataVal as number, new Date(converter as number * (dataVal as number)), format, fn);
		};
	};

	const parseDatetime = (dataVal: number, date: Date, format: any, fn: Function) => {
		switch(format){
			case "date-hms":
				return date.getUTCFullYear() +
					'-' + pad(date.getUTCMonth() + 1) +
					'-' + pad(date.getUTCDate()) +
					' ' + pad(date.getUTCHours()) +
					':' + pad(date.getUTCMinutes()) +
					':' + pad(date.getUTCSeconds());

			case "date-hm":
				return date.getUTCFullYear() +
					'-' + pad(date.getUTCMonth() + 1) +
					'-' + pad(date.getUTCDate()) +
					' ' + pad(date.getUTCHours()) +
					':' + pad(date.getUTCMinutes());

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
				return fn(dataVal);
		}
	};

	const day2ms = 24 * 3600 * 1000;
	const sec2ms = 1000;

	if (isDateTime(valueFormatX)){
		return {
			valueFormatter: valueFormatter(1, "date-hms"),
			axisLabelFormatter: axisLabelFormatter(1, getDateTimeFormat(daysDisplayed))
		};
	} else if (isDate(valueFormatX)) {
		return {
			valueFormatter: valueFormatter(day2ms, "date", formatLbl),
			axisLabelFormatter: axisLabelFormatter(day2ms, "date")
		};
	} else if (isTime(valueFormatX)) {
		return {
			valueFormatter: valueFormatter(sec2ms, "hms", formatLbl),
			axisLabelFormatter: axisLabelFormatter(sec2ms, "hm")
		};
	} else {
		return {valueFormatter: formatLbl, axisLabelFormatter: (val: number) => val % 1 !== 0 ? +val.toFixed(15) : val};
	}
};

const getDateTimeFormat = (daysDisplayed: number) => {
	if (daysDisplayed >= 7) return "date";
	else if (daysDisplayed >= 1) return "date-hm";
	else if (daysDisplayed < 1) return "hm";
};

// Stored as seconds since midnight
const timeFormats = ['iso8601timeOfDay']
	.map(segm => 'http://meta.icos-cp.eu/ontologies/cpmeta/' + segm);

// Stored as days since epoch
const dateFormats = ['iso8601date', 'etcDate']
	.map(segm => 'http://meta.icos-cp.eu/ontologies/cpmeta/' + segm);

// Stored as milliseconds since epoch
const dateTimeFormats = ['iso8601dateTime', 'isoLikeLocalDateTime', 'etcLocalDateTime']
	.map(segm => 'http://meta.icos-cp.eu/ontologies/cpmeta/' + segm);

const isTime = (valueFormat: string) => timeFormats.includes(valueFormat);
const isDate = (valueFormat: string) => dateFormats.includes(valueFormat);
const isDateTime = (valueFormat: string) => dateTimeFormats.includes(valueFormat);

const isColNameValid = (tableFormat: TableFormat, colName: string) => {
	return tableFormat.getColumnIndex(colName) >= 0;
};

const getColInfoParam = (tableFormat: TableFormat, colName: string, param: string) => {
	const colInfo = tableFormat.columns[tableFormat.getColumnIndex(colName)] as ColumnInfo & IdxSig;
	return colInfo[param];
};

const getLabel = (tableFormat: TableFormat, colName: string) => {
	const unit = getColInfoParam(tableFormat, colName, 'unit');
	const label = getColInfoParam(tableFormat, colName, 'label');

	return unit === '?' ? label : `${label} [${unit}]`;
};

const fail = (message: string) => {
	logError(config.previewTypes.TIMESERIES, message);
	return Promise.reject(new Error(message));
};

const presentError = (errMsg: string) => {
	document.getElementById('error')!.style.display = 'flex';
	document.getElementById('error')!.innerHTML = errMsg;

	logError(config.previewTypes.TIMESERIES, errMsg);
};

const hideError = () => {
	document.getElementById('error')!.style.display = 'none';
};

const formatData = (dataToSave: UrlSearchParams) => {
	return {
		previewTimeserie: {
			params: {
				objId: dataToSave.get('objId'),
				x: dataToSave.get('x'),
				y: dataToSave.get('y'),
				type: dataToSave.get('type')
			}
		}
	};
};
