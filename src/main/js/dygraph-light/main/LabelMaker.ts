import UrlSearchParams from "../../common/main/models/UrlSearchParams";
import {ColumnInfo, TableFormat} from "icos-cp-backend";
import PerSeriesOptions = dygraphs.PerSeriesOptions;
import {Obj} from "../../common/main/types";
import LegendData = dygraphs.LegendData;

type MetaWithTableFormat = {
	id: string
	objSpec: string
	nRows: number
	filename: string
	specLabel: string
	startedAtTime: string
	columnNames: string[] | undefined
	tableFormat: TableFormat
}

type LegendDataSerieIndexes = {
	y: number[],
	y2: number[]
}
type Linking = 'overlap' | 'concatenate'
type LegendTitles = {y: string, y2: string}

export default class LabelMaker {
	readonly ids: string[];
	readonly hasY2: boolean;
	readonly linking: Linking;
	private metadata?: Metadata[];
	readonly legendLabels: string[] = [];
	public chartTitle?: string;
	public xlabel: string = '';
	public xLegendLabel: string = '';
	public valueFormatX: string = '';
	public ylabel: string = '';
	public y2label: string = '';
	public labels: string[] = [];
	public object?: MetaWithTableFormat;
	public tableFormat?: TableFormat;
	private legendDataSerieIndexes: LegendDataSerieIndexes;
	public readonly legendTitles: LegendTitles;

	constructor(private params: UrlSearchParams) {
		this.ids = params.has('objId') ? params.get('objId').split(',') as string[] : [];
		this.linking = params.get('linking') === 'concatenate' ? 'concatenate' : 'overlap';
		this.hasY2 = params.has('y2');

		if (params.has('legendLabels'))
			this.legendLabels = params.get('legendLabels').split(',');

		this.legendDataSerieIndexes = getLegendDataIndexes(this.linking, this.ids, this.hasY2);
		this.legendTitles = {
			y: this.hasY2 ? params.get('y') : 'Legend',
			y2: params.get('y2')
		};
	}

	set objects(objects: MetaWithTableFormat[]){
		const specList = Array.from(new Set(objects.map(o => o.specLabel))).join(' / ');
		this.chartTitle = this.hasY2
			? `${specList} - ${this.params.get('y')} and ${this.params.get('y2')}`
			: `${specList} - ${this.params.get('y')}`;

		this.metadata = objects.map((object, idx) => new Metadata(this.linking, object, idx, this.params));

		this.object = objects.find(object =>
			isColNameValid(object.tableFormat, this.params.get('x'))
			&& isColNameValid(object.tableFormat, this.params.get('y'))
			&& (!this.hasY2 || isColNameValid(object.tableFormat, this.params.get('y2')))
		);

		if (this.object) {
			this.xlabel = getLabel(this.object.tableFormat, this.params.get('x'));
			this.xLegendLabel = getColInfoParam(this.object.tableFormat, this.params.get('x'), 'label');
			this.valueFormatX = getColInfoParam(this.object.tableFormat, this.params.get('x'), 'valueFormat');
			this.ylabel = getLabel(this.object.tableFormat, this.params.get('y'));
			if (this.hasY2)
				this.y2label = getLabel(this.object.tableFormat, this.params.get('y2'));

			if (this.linking === 'concatenate'){
				this.labels = this.hasY2
					? [this.xlabel].concat(this.metadata[0].labels.y).concat(this.metadata[0].labels.y2!)
					: [this.xlabel].concat(this.metadata[0].labels.y)
			} else {
				this.labels = this.hasY2
					? [this.xlabel].concat(this.metadata.flatMap(dobj => [dobj.labels.y,dobj.labels.y2!]))
					: [this.xlabel].concat(this.metadata.map(dobj => dobj.labels.y))
			}
		}
	}

	get title(){
		return this.chartTitle || '';
	}

	get sorted(){
		if (this.metadata === undefined) throw new Error('Data objects are not defined');

		return this.metadata.sort((obj1, obj2) =>
			new Date(obj1.object.startedAtTime).getTime() - new Date(obj2.object.startedAtTime).getTime());
	}

	get series(){
		if (!this.hasY2 || !this.metadata || this.metadata.some(dobj => dobj.labels.y2 === undefined))
			return {};

		// Use a single scale if y and y2 have the same value type
		if (this.object &&
			getColInfoParam(this.object.tableFormat, this.params.get('y'), 'label') ===
			getColInfoParam(this.object.tableFormat, this.params.get('y2'), 'label')) {
				return {};
		}

		return this.metadata.reduce<{[k: string]: PerSeriesOptions}>((acc, dobj) => {
			acc[dobj.labels.y] = {axis: 'y1'};
			acc[dobj.labels.y2!] = {axis: 'y2'};

			return acc;
		}, {});
	}

	legendData(data: LegendData){
		return {
			y: this.legendDataSerieIndexes.y.map(i => data.series[i]),
			y2: this.legendDataSerieIndexes.y2.map(i => data.series[i])
		};
	}
}

const getLegendDataIndexes = (linking: Linking, ids: string[], hasY2: boolean): LegendDataSerieIndexes => {
	if (linking === 'concatenate'){
		if (hasY2) {
			return {
				y: [0],
				y2: [1]
			};
		} else {
			return {
				y: [0],
				y2: []
			};
		}

	} else {
		const length = hasY2 ? ids.length * 2 : ids.length;
		const indexes = Array.from({length}, (_, i) => i);

		if (hasY2) {
			return {
				y: indexes.filter(idx => idx % 2 === 0),
				y2: indexes.filter(idx => idx % 2 !== 0)
			};
		} else {
			return {
				y: indexes,
				y2: []
			};
		}
	}
};

class Metadata {
	readonly labels: {y: string, y2?: string};

	constructor(linking: Linking, readonly object: MetaWithTableFormat, idx: number, params: UrlSearchParams) {
		const hasY2 = params.has('y2');
		const lblIdx = linking === 'concatenate' ? 0 : idx;

		// Labels must be unique in dygraphs
		const postfix = hasY2 && linking !== 'concatenate' ? ' '.repeat(idx + 2) : '';
		const postfixY2 = linking === 'concatenate' ? '' : ' ';

		const legendLabels = getLegendLabelsFromParams(params, 'legendLabels');
		const yLabel = getFinalLabel(linking, legendLabels, lblIdx, object, params.get('y'), postfix);

		let y2Label = undefined;

		if (hasY2) {
			const legendLabelsY2 = getLegendLabelsFromParams(params, 'legendLabelsY2');
			y2Label = getFinalLabel(linking, legendLabelsY2, lblIdx, object, params.get('y2'), postfixY2);
		}

		this.labels = {
			y: yLabel,
			y2: y2Label
		}
	}
}

const getFinalLabel = (linking: 'overlap' | 'concatenate', requestedLabels: string[], lblIdx: number, object: MetaWithTableFormat, colName: string, postfix: string = '') => {
	if (linking === 'concatenate'){
		return (requestedLabels.length > lblIdx && requestedLabels[lblIdx].length
			? requestedLabels[lblIdx]
			: getLabel(object.tableFormat, colName)) + postfix;

	} else {
		const filename = object.filename;

		return (requestedLabels.length > lblIdx && requestedLabels[lblIdx].length
			? requestedLabels[lblIdx]
			: filename.slice(0, filename.lastIndexOf('.'))) + postfix;
	}
};

const getLegendLabelsFromParams = (params: UrlSearchParams, name: string) => {
	return params.has(name)
		? params.get(name).split(',') as string[]
		: [];
};

const isColNameValid = (tableFormat: TableFormat, colName: string) => {
	return tableFormat.getColumnIndex(colName) >= 0;
};

const getLabel = (tableFormat: TableFormat, colName: string) => {
	const unit = getColInfoParam(tableFormat, colName, 'unit');
	const label = getColInfoParam(tableFormat, colName, 'label');

	return unit === '?' ? label : `${label} [${unit}]`;
};

const getColInfoParam = (tableFormat: TableFormat, colName: string, param: keyof Omit<ColumnInfo, 'isRegex' | 'flagCol'>) => {
	return tableFormat.columns[tableFormat.getColumnIndex(colName)][param];
};
