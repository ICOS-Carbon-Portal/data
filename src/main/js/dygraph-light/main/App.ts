import {getTableFormatNrows, getBinTable} from './backend';
import {logError, saveToRestheart} from '../../common/main/backend';
import UrlSearchParams from '../../common/main/models/UrlSearchParams';
import config, {ICOS, ICOSCities, SITES, envri} from '../../common/main/config';
import Dygraph, { dygraphs } from 'dygraphs';
import './Dygraphs.css';
import './custom.css';
import CollapsibleSection from './CollapsibleSection';
import {Spinner} from 'icos-cp-spinner';
import { Styles } from './CollapsibleSection'
import {BinTable} from "icos-cp-backend";
import LegendData = dygraphs.LegendData;
import SeriesLegendData = dygraphs.SeriesLegendData;
import LabelMaker from "./LabelMaker";

const spinnerDelay = 100;
const invalidReqMsg = `
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
		<li>y2: Parameter name for a second Y axis.</li>
		<li>legendLabelsY2: List (comma separated matching order of objId) of labels for second Y axis for legend. Defaults to file name.</li>
	</ul>

	<div style="margin-top:30px;">
		<a href="?objId=-xQ2wgAt-ZjdGaCEJnKQIEIu,0EwfR9LutvnBbvgW-KJdq2U0&x=TIMESTAMP&linking=overlap&y=co2&legendLabels=HPB 93.0,SMR 67.2&legendClosed">Example</a>
	</div>
</div>`;

const stylesCollapsibleSection: Styles = {
	details: {
		position: 'absolute',
		zIndex: 9999,
		backgroundColor: 'white',
		border: '1px solid black',
		padding: 5,
		borderRadius: 5,
		boxShadow: '9px 8px 20px -18px rgba(0,0,0,0.75)'
	},
	summary: {
		fontWeight: 'bold',
		cursor: 'pointer'
	},
	anchor: {
		marginTop: 7
	}
};

type BinTableLike = Pick<BinTable, 'nCols' | 'values' | 'length'>
const emptyBinTable = {
	nCols: 2,
	values: <T>(columnIndices: number[], converter: (subrow: Array<string | number>) => T) => [0],
	length: 0
} as BinTableLike;

export default class App {
	private graph?: Dygraph;
	private lastDateFormat?: ReturnType<typeof getDateTimeFormat>;
	private spinner: typeof Spinner;
	private legend: CollapsibleSection;
	private timer: number = 0;
	private labelMaker: LabelMaker;
	private legendY2: CollapsibleSection;

	constructor(readonly config: any, private params: UrlSearchParams){
		this.graph = undefined;
		this.lastDateFormat = undefined;
		this.labelMaker = new LabelMaker(params);

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

					this.labelMaker = new LabelMaker(this.params);
					this.legend.updateSummary(this.labelMaker.legendTitles.y);
					this.legendY2.updateSummary(this.labelMaker.legendTitles.y2);

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
				presentError(invalidReqMsg);
			}
		}

		this.legend = new CollapsibleSection('legend', this.labelMaker.legendTitles.y, stylesCollapsibleSection, this.params.get('legendClosed'), true);
		this.legendY2 = new CollapsibleSection('legendY2', this.labelMaker.legendTitles.y2, stylesCollapsibleSection, this.params.get('legendClosed'), true);
	}

	main(){
		const params = this.params;
		saveToRestheart(formatData(params));

		const colNameX = params.get('x');
		const colNameY = params.get('y');
		const colNameY2 = params.get('y2');

		return getTableFormatNrows(this.config, this.labelMaker.ids).then(objects => {
			this.labelMaker.objects = objects;

			if (this.labelMaker.object === undefined) {
				const msg = colNameY2
					? `Parameter x (${colNameX}), parameter y (${colNameY}) or parameter y2 (${colNameY2}) does not exist in data`
					: `Parameter x (${colNameX}) or parameter y (${colNameY}) does not exist in data`;
				return fail(msg);
			}

			if (this.labelMaker.metadata === undefined) throw new Error('Data objects are not defined');
			this.initGraph();
			return this.labelMaker.metadata;

		})
		.then(metadata =>
			Promise.all(
				metadata.map(dobj =>
					getBinTable(colNameX, colNameY, dobj.object.id, dobj.object.tableFormat, dobj.object.nRows, colNameY2)
				)
			)
		)
		.then(binTables => {
			const definedBinTables = binTables.map(bt => bt === undefined ? emptyBinTable : bt);

			if (definedBinTables.length > 0 && definedBinTables.every(bt => bt && bt.nCols)) {
				this.drawGraph(definedBinTables);
			}
		})
		.catch(err => {
			this.showSpinner(false);
			presentError(err.message);
		});
	}

	getPortalLink(){
		const callingUrl = window.frameElement
			? new URL(window.frameElement.baseURI)
			: undefined;
		const hostname = callingUrl?.hostname;
		const isIframeInPortal = hostname?.endsWith(".icos-cp.eu") || hostname?.endsWith(".fieldsites.se");

		if (isIframeInPortal)
			return document.createElement("div");

		const logo = document.createElement("img");
		let logoStyle = '';

		switch(envri) {
			case ICOS:
				logo.src = "https://static.icos-cp.eu/images/Icos_cp_Logo.svg";
				logo.title = "View in Carbon Portal";
				logoStyle = "height:30px;vertical-align:middle;position:relative;top:-6px;";
				break;
			case SITES:
				logo.src = "https://static.icos-cp.eu/images/sites-logo.png";
				logo.title = "View in the SITES data portal";
				logoStyle = "height:19px;vertical-align:middle;";
				break;
			case ICOSCities:
				logo.src = "https://static.icos-cp.eu/images/Icos_cp_Logo.svg";
				logo.title = "View in the ICOS Cities data portal";
				logoStyle = "height:30px;vertical-align:middle;position:relative;top:-6px;";
				break;
		}

		logo.setAttribute("style", logoStyle);

		const lnk = document.createElement("a");
		const hash = JSON.stringify({"route":"preview","preview":this.labelMaker.ids});
		lnk.href = `${location.origin}/portal/#${encodeURIComponent(hash)}`;
		lnk.appendChild(logo);

		return lnk;
	}

	initGraph(){
		this.showSpinner(true);

		const homeElement = document.getElementById("home");
		if (homeElement)
			homeElement.appendChild(this.getPortalLink());

		const { xlabel, xLegendLabel, ylabel, y2label, labels, uniqueLabels, valueFormatX, series } = this.labelMaker;
		const strokeWidth = this.params.get('type') === 'line' ? 1 : 0;
		const xIsDate = isDate(valueFormatX) || isDateTime(valueFormatX) || isTime(valueFormatX);
		const formatters = getFormatters(xLegendLabel, valueFormatX);
		const drawPoints = this.params.get('type') !== 'line';

		let daysDisplayed = 0;
		const getDaysDisplayed = ([min, max]: number[]) => (max - min) / (24 * 3600 * 1000);

		this.graph = new Dygraph(
			'graph',
			[Array(labels.length).fill(0)],
			{
				title: this.labelMaker.title,
				titleHeight: 44,
				strokeWidth,
				drawPoints,
				legend: 'always',
				labelsDiv: 'legend',
				labelsSeparateLines: true,
				legendFormatter: this.legendFormatter.bind(this),
				xlabel,
				ylabel,
				y2label,
				labels: uniqueLabels,
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
						independentTicks: true
					},
					y2: {
						independentTicks: false
					}
				},
				series,
				drawCallback: (graph: Dygraph, isInitial: boolean) => {
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
			this.graph!.updateOptions({axes: {x: {axisLabelFormatter: axisLabelFormatter as AxisLabelFormatter}}});
			this.lastDateFormat = currentDateTimeFormat;
		}
	}

	legendFormatter(data: LegendData){
		const series = this.labelMaker.legendData(data);

		if (this.labelMaker.hasY2) {
			this.legendY2.updateContent(this.getLegendContent(data.x, data.xHTML, series.y2));
		}

		return this.getLegendContent(data.x, data.xHTML, series.y);
	}

	getLegendContent(x: number, xHTML: string, series: SeriesLegendData[]){
		return `${x === undefined ? '' : xHTML}<br><table>` + series.map(serie => {
			if (serie === undefined) return '';
			return `<tr style="color:${serie.color}"><td>${serie.labelHTML}:</td><td>${isNaN(serie.yHTML as unknown as number) ? '' : serie.yHTML}</td></tr>`
		}).join('') + '</table>';
	}

	drawGraph(binTables: (BinTable | BinTableLike)[]){
		let allXValsAreNaN = true;
		let allYValsAreNaN = true;
		let allY2ValsAreNaN = this.labelMaker.hasY2;

		const dataFn = () => {
			const colIndices = this.labelMaker.hasY2 ? [0, 1, 2] : [0, 1];

			if (this.params.get('linking') === 'concatenate') {
				// Concatenation

				if (isDateTime(this.labelMaker.valueFormatX)){
					return binTables.flatMap(binTable => binTable.values(colIndices, subrow => {
						allXValsAreNaN = allXValsAreNaN && isNaN(subrow[0] as number);
						allYValsAreNaN = allYValsAreNaN && isNaN(subrow[1] as number);

						if (this.labelMaker.hasY2)
							allY2ValsAreNaN = allY2ValsAreNaN && isNaN(subrow[2] as number);

						return this.labelMaker.hasY2
							? [new Date(subrow[0]), subrow[1], subrow[2]]
							: [new Date(subrow[0]), subrow[1]];
					}));

				} else {
					return binTables.flatMap(binTable => binTable.values(colIndices, subrow => {
						allXValsAreNaN = allXValsAreNaN && isNaN(subrow[0] as number);
						allYValsAreNaN = allYValsAreNaN && isNaN(subrow[1] as number);

						if (this.labelMaker.hasY2)
							allY2ValsAreNaN = allY2ValsAreNaN && isNaN(subrow[2] as number);

						return subrow as number[];
					})).sort((d1, d2) => d1[0] - d2[0]);
				}

			} else {
				// Overlap
				const dates = binTables.filter(binTable => binTable.length).flatMap(binTable => binTable.values([0], v => v[0])) as number[];
				const uniqueDates = Array.from(new Set(dates));
				const emptySubRow = colIndices.slice(1).map(_ => NaN);
				let dateList = new Map(uniqueDates.map(i => [i, Array(binTables.length).fill(emptySubRow)])) as Map<number, number[][]>;

				binTables.forEach((binTable, index) => {
					binTable.values(colIndices, (subrow) => {
						let v = dateList.get(subrow[0] as number);
						if (v === undefined) throw new Error("Could not get subrow from dateList");

						v[index] = subrow.slice(1) as number[];
						allXValsAreNaN = allXValsAreNaN && isNaN(subrow[0] as number);
						allYValsAreNaN = allYValsAreNaN && isNaN(subrow[1] as number);

						if (this.labelMaker.hasY2)
							allY2ValsAreNaN = allY2ValsAreNaN && isNaN(subrow[2] as number);

						dateList.set(subrow[0] as number, v);
					});
				});

				return Array.from(dateList).map(([k, v]) => [k].concat(v.flat(1))).sort((d1, d2) => d1[0] - d2[0]);
			}
		};

		const data = dataFn();

		if (allXValsAreNaN || allYValsAreNaN || allY2ValsAreNaN){
			if (allXValsAreNaN) {
				presentError(`Selected X column (${this.params.get('x')}) does not contain any values`);

			} else if (allYValsAreNaN) {
				presentError(`Selected Y column (${this.params.get('y')}) does not contain any values`);

			} else if (allY2ValsAreNaN) {
				presentError(`Selected Y2 column (${this.params.get('y2')}) does not contain any values`);
			}

			this.showSpinner(false);
			return;
		}

		this.graph && this.graph.updateOptions({file: data as any});
		this.showCollapsible();
		this.showSpinner(false);
	}

	showCollapsible(){
		const xAxisRange = this.graph!.xAxisExtremes();
		const xCoord = this.graph!.toDomXCoord(xAxisRange[0]);
		const titleHeight = this.graph!.getOption('titleHeight');
		const graphStyle = window.getComputedStyle(document.getElementById("graph")!);
		const top = parseInt(graphStyle.top);
		const left = parseInt(graphStyle.left);

		const posLegend = {
			top: top + titleHeight + 2,
			left: left + xCoord + 2
		};

		this.legend.setPosition(posLegend);
		this.legend.show();

		if (this.labelMaker.hasY2) {
			this.legendY2.setPosition({top: posLegend.top, right: 1});
			this.legendY2.show();
		} else {
			this.legendY2.hide();
		}
	}

	showSpinner(show: boolean){
		if (show) {
			this.timer = window.setTimeout(() => this.spinner.show(), spinnerDelay);
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

	const parseDatetime = (dataVal: number, date: Date, format: any, fn: Function): string => {
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
	} else if (isYearMonth(valueFormatX)) {
		return {
			valueFormatter: presentYearMonth,
			axisLabelFormatter: presentYearMonth
		};
	} else if (isTime(valueFormatX)) {
		return {
			valueFormatter: valueFormatter(sec2ms, "hms", formatLbl),
			axisLabelFormatter: axisLabelFormatter(sec2ms, "hm")
		};
	} else if (isInt(valueFormatX)) {
		return {
			valueFormatter: ((value: number) => value),
			axisLabelFormatter: ((value: number) => value.toFixed(0))
		}
	} else {
		return {valueFormatter: formatLbl, axisLabelFormatter: (val: number) => val % 1 !== 0 ? +val.toFixed(15) : val};
	}
};

function presentYearMonth(val: number): string{
	const year = Math.floor(val / 12)
	const month = Math.round(val % 12) + 1
	return `${year}-` + ('0' + month).slice(-2)
}

const getDateTimeFormat = (daysDisplayed: number) => {
	if (daysDisplayed >= 7) return "date";
	else if (daysDisplayed >= 1) return "date-hm";
	else return "hm";
};

// Stored as seconds since midnight
const timeFormats = ['iso8601timeOfDay'].map(valFormatFromUriSegment)

// Stored as days since epoch
const dateFormats = ['iso8601date', 'etcDate'].map(valFormatFromUriSegment)

// Stored as 32-bit integer of format YYYY * 12 + MM - 1
const yearMonthFormat = valFormatFromUriSegment('iso8601month')

// Stored as milliseconds since epoch
const dateTimeFormats = ['iso8601dateTime', 'isoLikeLocalDateTime', 'etcLocalDateTime'].map(valFormatFromUriSegment)

const integerFormat = valFormatFromUriSegment('int32');

const isTime = (valueFormat: string) => timeFormats.includes(valueFormat);
const isDate = (valueFormat: string) => dateFormats.includes(valueFormat);
const isYearMonth = (valueFormat: string) => yearMonthFormat === valueFormat
const isDateTime = (valueFormat: string) => dateTimeFormats.includes(valueFormat);
const isInt = (valueFormat: string) => integerFormat === valueFormat

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

function valFormatFromUriSegment(lastSegment: string): string{
	return `http://meta.icos-cp.eu/ontologies/cpmeta/${lastSegment}`
}
