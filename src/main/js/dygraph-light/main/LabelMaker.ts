import UrlSearchParams from "../../common/main/models/UrlSearchParams";
import {ColumnInfo, TableFormat} from "icos-cp-backend";
import { dygraphs } from "dygraphs";
import PerSeriesOptions = dygraphs.PerSeriesOptions;
import LegendData = dygraphs.LegendData;

export type MetaWithTableFormat = {
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
	public metadata?: Metadata[];
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
		const sortedObjects = objects.sort((obj1, obj2) =>
			new Date(obj1.startedAtTime).getTime() - new Date(obj2.startedAtTime).getTime()
		);
		const specList = Array.from(new Set(sortedObjects.map(o => o.specLabel))).join(' / ');
		this.chartTitle = this.hasY2
			? `${specList} - ${this.params.get('y')} and ${this.params.get('y2')}`
			: `${specList} - ${this.params.get('y')}`;

		this.metadata = sortedObjects.map((object, idx) => new Metadata(this.linking, object, idx, this.params));

		this.object = sortedObjects.find(object =>
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
					: [this.xlabel].concat(this.metadata[0].labels.y);
			} else {
				this.labels = this.hasY2
					? [this.xlabel].concat(this.metadata.flatMap(dobj => [dobj.labels.y,dobj.labels.y2!]))
					: [this.xlabel].concat(this.metadata.map(dobj => dobj.labels.y));
			}
		}
	}

	get title(){
		return !window.frameElement && this.chartTitle || ' ';
	}

	get series(){
		if (!this.hasY2 || !this.metadata || this.metadata.some(dobj => dobj.labels.y2 === undefined))
			return {};

		// Use a single scale if y and y2 have the same value type
		if (this.object){
			const mwtf = this.object;//to keep the compiler happy
			const yColInfo = (ycol: 'y' | 'y2', key: keyof ColumnInfo) => {
				return getColInfoParam(mwtf.tableFormat, this.params.get(ycol), key);
			}

			const sameValueType = (['label', 'unit'] as const).every(key =>
				yColInfo('y', key) === yColInfo('y2', key)
			)
			if(sameValueType) return {};
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

	get uniqueLabels() {
		return this.labels.reduce<string[]>((acc, lbl, idx) => {
			if (acc.includes(lbl))
				acc.push(`${idx} ${lbl}`);
			else
				acc.push(lbl);

			return acc;
		}, []);
	}
}

function getLegendDataIndexes(linking: Linking, ids: string[], hasY2: boolean): LegendDataSerieIndexes {
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
}

class Metadata {
	readonly labels: {y: string, y2?: string};

	constructor(linking: Linking, readonly object: MetaWithTableFormat, idx: number, params: UrlSearchParams) {
		const hasY2 = params.has('y2');

		// Labels must be unique in dygraphs
		const postfix = hasY2 && linking !== 'concatenate' ? ' '.repeat(idx + 2) : '';
		const postfixY2 = linking === 'concatenate' ? '' : ' ';

		const paramsYLabel = getLegendLabelFromParams(params, 'legendLabels', object.id);
		const yLabel = getFinalLabel(linking, paramsYLabel, object, params.get('y'), postfix);

		let y2Label: string | undefined = undefined;

		if (hasY2) {
			const paramsY2Label = getLegendLabelFromParams(params, 'legendLabelsY2', object.id);
			y2Label = getFinalLabel(linking, paramsY2Label, object, params.get('y2'), postfixY2);
		}

		this.labels = {
			y: yLabel,
			y2: y2Label
		};
	}
}

function getFinalLabel(linking: 'overlap' | 'concatenate', requestedLabel: string, object: MetaWithTableFormat, colName: string, postfix: string = '') {
	if (requestedLabel) return requestedLabel + postfix;

	if (linking === 'concatenate'){
		return getLabel(object.tableFormat, colName) + postfix;
	} 
	const filename = object.filename;

	return filename.slice(0, filename.lastIndexOf('.')) + postfix;
}

function getLegendLabelFromParams(params: UrlSearchParams, name: string, objId: string) {
	const labels: string[] = params.has(name) ? params.get(name).split(',') : [];
	const ids: string[] = params.has('objId') ? params.get('objId').split(',') : [];
	
	if (labels.length === 0 || ids.length === 0) return '';
	
	const idx = ids.findIndex(id => objId.includes(id));

	return (idx !== -1 && labels[idx]) ? labels[idx] : '';
}

function isColNameValid(tableFormat: TableFormat, colName: string) {
	return tableFormat.getColumnIndex(colName) >= 0;
}

function getLabel(tableFormat: TableFormat, colName: string) {
	const unit = getColInfoParam(tableFormat, colName, 'unit');
	const label = getColInfoParam(tableFormat, colName, 'label');

	return unit === '?' ? label : `${label} [${unit}]`;
}

function getColInfoParam<T extends keyof ColumnInfo>(tableFormat: TableFormat, colName: string, param: T) {
	return tableFormat.columns[tableFormat.getColumnIndex(colName)][param];
}
