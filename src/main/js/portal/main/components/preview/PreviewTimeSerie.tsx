import React, { ChangeEvent, Component } from 'react';
import {distinct, getLastSegmentInUrl, isDefined, wholeStringRegExp} from '../../utils'
import config, { previewExcludeChartType } from '../../config';
import {ExtendedDobjInfo, State, TsSetting} from "../../models/State";
import CartItem from "../../models/CartItem";
import Preview, {PreviewOption, previewVarCompare} from "../../models/Preview";
import { lastUrlPart, TableFormat } from 'icos-cp-backend';
import { UrlStr } from '../../backend/declarations';
import TableFormatCache from '../../../../common/main/TableFormatCache';
import commonConfig, { TIMESERIES } from '../../../../common/main/config'
import PreviewControls from './PreviewControls';


interface OurProps {
	preview: State['preview']
	extendedDobjInfo: State['extendedDobjInfo']
	tsSettings: State['tsSettings']
	storeTsPreviewSetting: (spec: string, type: string, val: string) => void
	setPreviewYAxis: (y?: string) => void
	setPreviewY2Axis: (y2?: string) => void
	iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement>) => void
}

interface OurState {
	tableFormat?: TableFormat
}

type PreviewItem = CartItem & Partial<ExtendedDobjInfo>

const iFrameBaseUrl = config.iFrameBaseUrl["TIMESERIES"];

export default class PreviewTimeSerie extends Component<OurProps, OurState> {
	private iframe: HTMLIFrameElement | null = null;
	private tfCache: TableFormatCache = new TableFormatCache(commonConfig);

	constructor(props: OurProps){
		super(props);

		this.state = {
			tableFormat: undefined
		};

		this.getTableFormat();
	}

	getTableFormat(idx: number = 0) {
		const preview = this.props.preview;
		if (preview.items.length === 0 || this.tfCache.isInCache(preview.items[idx].spec)) return;

		this.tfCache.getTableFormat(preview.items[idx].spec)
			.then(tableFormat => this.setState({ tableFormat }));
	}

	handleSelectAction(ev: ChangeEvent<HTMLSelectElement>){
		const { preview, iframeSrcChange, storeTsPreviewSetting, setPreviewYAxis, setPreviewY2Axis } = this.props;
		const {name, selectedIndex, options} = ev.target;

		if ((selectedIndex > 0 || name === 'y2') && iframeSrcChange) {
			if (selectedIndex === 0){
				preview.item.deleteKeyValPair(name);
			}
			const keyVal = selectedIndex === 0
				? {}
				: {[name]: options[selectedIndex].value};
			const newUrl = preview.item.getNewUrl(keyVal);
			iframeSrcChange({target: {src: newUrl}} as ChangeEvent<HTMLIFrameElement>);

			if (this.iframe && this.iframe.contentWindow) {
				this.iframe.contentWindow.postMessage(newUrl, "*");
			}

			if (selectedIndex > 0)
				storeTsPreviewSetting(preview.item.spec, name, options[selectedIndex].value);

			const value = selectedIndex > 0 ? options[selectedIndex].value : undefined;
			if (name === 'y') {
				setPreviewYAxis(value)
			} else if (name === 'y2') {
				setPreviewY2Axis(value)
			}
		}
	}

	handleChartTypeAction(currentChartType: 'line' | 'scatter'){
		const { preview, iframeSrcChange, storeTsPreviewSetting } = this.props;
		const value = currentChartType == 'scatter' ? 'line' : 'scatter';
		const newUrl = preview.item.getNewUrl({ ['type']: value});
		iframeSrcChange({ target: { src: newUrl } } as ChangeEvent<HTMLIFrameElement>);

		if (this.iframe && this.iframe.contentWindow) {
			this.iframe.contentWindow.postMessage(newUrl, "*");
		}

		storeTsPreviewSetting(preview.item.spec, 'type', value);

	}

	shouldComponentUpdate(nextProps: OurProps, nextState: OurState) {
		return !!nextState.tableFormat || (this.props.extendedDobjInfo.length === 0 && nextProps.extendedDobjInfo.length > 0);
	}

	private makePreviewOption(actColName: string): PreviewOption | undefined {
		const {preview} = this.props;
		const verbatimMatch = preview.options.find(opt => opt.varTitle === actColName);
		if(verbatimMatch) return verbatimMatch;
		const regexMatch = preview.options.find((opt: PreviewOption) => testRegexColMatch(opt, actColName));
		if(!regexMatch) return; //no preview for columns that are not in portal app's metadata (e.g. flag columns)
		return {...regexMatch, varTitle: actColName};
	}

	private syncTsSettingStoreWithUrl({xAxis, yAxis, y2Axis, type}: Axes, specSettings: TsSetting) {
		const { preview, storeTsPreviewSetting } = this.props;

		if (yAxis && specSettings.y != yAxis)
			storeTsPreviewSetting(preview.item.spec, 'y', yAxis);
		if (xAxis && specSettings.x != xAxis)
			storeTsPreviewSetting(preview.item.spec, 'x', xAxis);
		if (y2Axis && specSettings.y2 != y2Axis)
			storeTsPreviewSetting(preview.item.spec, 'y2', y2Axis);
		if (type && specSettings.type != type)
			storeTsPreviewSetting(preview.item.spec, 'type', type);
	}

	render(){
		const { preview, extendedDobjInfo, tsSettings } = this.props;
		const { tableFormat } = this.state;

		// Add station information
		const items: PreviewItem[] = preview.items.map(cItem => {
			const item: PreviewItem = cItem
			const extendedInfo = extendedDobjInfo.find(ext => ext.dobj === item.dobj);
			item.station = extendedInfo?.station;
			item.stationId = extendedInfo?.stationId;
			item.samplingHeight = extendedInfo?.samplingHeight;
			item.columnNames = extendedInfo?.columnNames;
			return item;
		});

		// Determine if curves should concatenate or overlap
		const linking: string = items.reduce((acc: string, curr: PreviewItem) => {
			return items.reduce((acc2: string, curr2: PreviewItem) => {
				if ((curr.dobj !== curr2.dobj) &&
					(curr.station === curr2.station) &&
					(curr.site && curr2.site && curr.site === curr2.site) &&
					((curr.timeEnd < curr2.timeStart) ||
					(curr.timeStart > curr2.timeEnd)) &&
					(!curr.samplingHeight || curr.samplingHeight === curr2.samplingHeight)) {
					return 'concatenate';
				}
				return acc2;
			}, 'overlap');
		}, '');

		const allItemsHaveColumnNames = items.every((cur: PreviewItem) => !!(cur.columnNames));

		const legendLabels = extendedDobjInfo.length > 0 ? getLegendLabels(items) : undefined;

		const options: PreviewOption[] = allItemsHaveColumnNames
			? distinct(items.flatMap(item  => item.columnNames ?? []))
				.flatMap(colName => this.makePreviewOption(colName) ?? [])
				.sort(previewVarCompare)
			: preview.options;

		const specSettings: TsSetting = tsSettings[preview.item.spec] || {} as TsSetting;
		const {xAxis, yAxis, y2Axis, type} = getAxes(options, preview, specSettings);
		const objIds = preview.items.map((i: CartItem) => getLastSegmentInUrl(i.dobj)).join();

		const showChartTypeControl = !previewExcludeChartType.datasets.includes(preview.item.dataset!);

		const yParam = yAxis ? `&y=${yAxis}` : '';
		const y2Param = y2Axis ? `&y2=${y2Axis}` : '';
		const legendLabelsParams = legendLabels ? `&legendLabels=${legendLabels}` : '';
		const legendLabelsY2Params = y2Axis && legendLabels ? `&legendLabelsY2=${legendLabels}` : '';
		const iframeUrl = `${window.document.location.protocol}//${window.document.location.host}${iFrameBaseUrl}?objId=${objIds}&x=${xAxis}${yParam}${y2Param}&type=${type}&linking=${linking}${legendLabelsParams}${legendLabelsY2Params}`;

		if (!preview)
			return null;

		this.syncTsSettingStoreWithUrl({xAxis, yAxis, y2Axis, type}, specSettings);

		return (
			<>
				<div className="row pb-2 gy-2">
					<div className="col-md-3">
						<Selector
							name="y"
							label="Y axis"
							selected={yAxis}
							options={options}
							selectAction={this.handleSelectAction.bind(this)}
						/>
					</div>
					{yAxis &&
					<div className="col-md-3">
						<Selector
							name="y2"
							label="Y2 axis"
							selected={y2Axis}
							options={options}
							selectAction={this.handleSelectAction.bind(this)}
							defaultOptionLabel="Select a second parameter"
						/>
					</div>
					}
					{yAxis &&
						<PreviewControls
							iframeUrl={iframeUrl}
							previewType={TIMESERIES}
							csvDownloadUrl={csvDownloadUrl(preview.item, tableFormat)}
							chartType={type}
							chartTypeAction={this.handleChartTypeAction.bind(this)}
							showChartTypeControl={showChartTypeControl}
						/>
					}
				</div>

				{yAxis ?
				<>
					<div className="row mb-4">
						<div className="col">
							<div style={{ position: 'relative', padding: '20%' }}>
								<iframe ref={iframe => this.iframe = iframe} onLoad={this.props.iframeSrcChange}
									style={{ border: '1px solid #eee', position: 'absolute', top: 5, left: 0, width: '100%', height: '100%' }}
									src={iframeUrl}
								/>
							</div>
						</div>
					</div>

					<div className="row">
						<div className="col-md-3 ms-auto me-auto">
							<Selector
								name="x"
								label="X axis"
								selected={xAxis}
								options={options}
								selectAction={this.handleSelectAction.bind(this)}
							/>
						</div>
					</div>
				</>
				:
				<div className="py-2"></div>
				}
			</>
		);
	}
}

type Axes = {
	xAxis?: string
	yAxis?: string
	y2Axis?: string
	type?: 'line' | 'scatter'
}
const getAxes = (options: PreviewOption[], preview: Preview, specSettings: TsSetting): Axes => {
	const getColName = (colName: string) => {
		const option = options.some((opt: PreviewOption) => opt.varTitle === colName);
		return option ? colName : undefined;
	};

	return preview.item && preview.item.hasKeyValPairs
		? {
			xAxis: preview.item.getUrlSearchValue('x') || getColName(specSettings.x),
			yAxis: preview.item.getUrlSearchValue('y') || getColName(specSettings.y),
			y2Axis: preview.item.getUrlSearchValue('y2')  || getColName(specSettings.y2),
			type: specSettings.type || preview.item.getUrlSearchValue('type') as Axes['type']
		}
		: { xAxis: undefined, yAxis: undefined, y2Axis: undefined, type: undefined};
};

type SelectorProps = {
	name: string
	label: string
	selected?: string
	options: PreviewOption[]
	defaultOptionLabel?: string
	selectAction: (event: ChangeEvent<HTMLSelectElement>) => void
}
const Selector = (props: SelectorProps) => {
	const value = props.selected ? decodeURIComponent(props.selected) : '0';
	const defaultOptionLabel = props.defaultOptionLabel ?? "Select a parameter";
	const getTxt = (option: PreviewOption) => {
		return option.varTitle === option.valTypeLabel
			? option.varTitle
			: `${option.varTitle}—${option.valTypeLabel}`;
	};

	return (
		<span>
			<select name={props.name} className="form-select" onChange={props.selectAction} value={value}>
				<option value="0">{defaultOptionLabel}</option>
				{props.options.map((o: PreviewOption, i: number) =>
					<option value={o.varTitle} key={props.label.slice(0, 1) + i}>{getTxt(o)}</option>)}
			</select>
		</span>
	);
};

const getLegendLabels = (items: PreviewItem[]) => {
	return items.map(item => item.stationId && item.samplingHeight ? `${item.stationId} ${item.samplingHeight} m Level ${item.level}` : '').join(',');
};

function csvDownloadUrl(item: CartItem, tableFormat?: TableFormat): UrlStr {
	if (tableFormat === undefined) return '';

	const x = item.getUrlSearchValue('x');
	const y = item.getUrlSearchValue('y');
	const y2 = item.getUrlSearchValue('y2');

	if (x === undefined || (y === undefined && y2 === undefined)) return '';

	const hashId = lastUrlPart(item.dobj);
	const cols = [x, y, y2].filter(isDefined).reduce<string[]>((acc, colName) => {
		acc.push(colName);

		const flagCol = tableFormat.columns.find(col => col.name === colName)?.flagCol;

		if (flagCol !== undefined)
			acc.push(flagCol);

		return acc;
	}, [])
		.map(col => `col=${col}`).join('&');

	const baseUri = new URL('/csv', document.baseURI).href
	return `${baseUri}/${hashId}?${cols}`;
}

function testRegexColMatch(opt: PreviewOption, actColName: string): boolean {
	try{
		return wholeStringRegExp(opt.varTitle).test(actColName)
	} catch {
		return false
	}
}
