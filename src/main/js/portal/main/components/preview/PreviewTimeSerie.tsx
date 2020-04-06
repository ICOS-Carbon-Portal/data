import React, {ChangeEvent, Component} from 'react';
import {distinct, getLastSegmentInUrl, wholeStringRegExp} from '../../utils'
import config from '../../config';
import {State, TsSetting} from "../../models/State";
import CartItem from "../../models/CartItem";
import Preview, {PreviewItem, PreviewOption} from "../../models/Preview";


interface OurProps {
	preview: State['preview']
	extendedDobjInfo: State['extendedDobjInfo']
	tsSettings: State['tsSettings']
	storeTsPreviewSetting: (spec: string, type: string, val: string) => void
	iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement>) => void
}

const iFrameBaseUrl = config.iFrameBaseUrl[config.TIMESERIES];

export default class PreviewTimeSerie extends Component<OurProps> {
	private iframe: HTMLIFrameElement | null = null;

	constructor(props: OurProps){
		super(props);
	}

	handleSelectAction(ev: ChangeEvent<HTMLSelectElement>){
		const {preview, iframeSrcChange, storeTsPreviewSetting} = this.props;
		const selectedIdx = ev.target.selectedIndex;

		if (selectedIdx > 0 && iframeSrcChange) {
			const selectedVal = ev.target.options[selectedIdx].value;
			const setting = ev.target.name;
			const newUrl = preview.items[0].getNewUrl({[setting]: selectedVal});

			iframeSrcChange({target: {src: newUrl}} as ChangeEvent<HTMLIFrameElement>);
			if (this.iframe && this.iframe.contentWindow) {
				this.iframe.contentWindow.postMessage(newUrl, "*");
			}

			storeTsPreviewSetting(preview.item.spec, setting, selectedVal);
		}
	}

	shouldComponentUpdate(nextProps: OurProps) {
		return this.props.extendedDobjInfo.length === 0 && nextProps.extendedDobjInfo.length > 0;
	}

	getIFrame(objIds: string, linking: string, x?: string, y?: string, type?: 'line' | 'scatter', legendLabels?: string){
		const yParam = y ? `&y=${y}` : '';
		const legendLabelsParams = legendLabels ? `&legendLabels=${legendLabels}` : '';

		return <iframe ref={iframe => this.iframe = iframe} onLoad={this.props.iframeSrcChange}
			style={{border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'}}
			src={`${iFrameBaseUrl}?objId=${objIds}&x=${x}${yParam}&type=${type}&linking=${linking}${legendLabelsParams}`}
		/>;
	}

	private makePreviewOption(actColName: string): PreviewOption | undefined {
		const {preview} = this.props;
		const verbatimMatch = preview.options.find(opt => opt.colTitle === actColName);
		if(verbatimMatch) return verbatimMatch;
		const regexMatch = preview.options.find((opt: PreviewOption) => wholeStringRegExp(opt.colTitle).test(actColName));
		if(!regexMatch) return; //no preview for columns that are not in portal app's metadata (e.g. flag columns)
		return {...regexMatch, ...{colTitle: actColName}};
	}

	render(){
		const {preview, extendedDobjInfo, tsSettings} = this.props;

		// Add station information
		const items: PreviewItem[] = preview.items.map((item: PreviewItem) => {
			const extendedInfo = this.props.extendedDobjInfo.find(ext => ext.dobj === item.id);
			item.station = extendedInfo ? extendedInfo.station : undefined;
			item.stationId = extendedInfo ? extendedInfo.stationId : undefined;
			item.samplingHeight = extendedInfo ? extendedInfo.samplingHeight : undefined;
			item.columnNames = extendedInfo ? extendedInfo.columnNames : undefined;
			return item;
		});

		// Determine if curves should concatenate or overlap
		const linking: string = items.reduce((acc: string, curr: PreviewItem) => {
			return items.reduce((acc2: string, curr2: PreviewItem) => {
				if ((curr.id !== curr2.id) &&
					(curr.station === curr2.station) &&
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
			: preview.options;

		const chartTypeOptions: PreviewOption[] = [
			{colTitle: 'scatter', valTypeLabel: 'scatter'},
			{colTitle: 'line', valTypeLabel: 'line'},
		];

		const specSettings: TsSetting = tsSettings[preview.item.spec] || {};
		const {xAxis, yAxis, type} = getAxes(options, preview, specSettings);
		const objIds = preview.items.map((i: CartItem) => getLastSegmentInUrl(i.id)).join();

		return (
			<div>
				{preview
					? <div>

						<div className="panel-body" style={{paddingTop: 0}}>
							<div className="row">
								<div className="col-md-3">
									<Selector
										name="x"
										label="X axis"
										selected={xAxis}
										options={options}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
								<div className="col-md-3">
									<Selector
										name="y"
										label="Y axis"
										selected={yAxis}
										options={options}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
								<div className="col-md-3">
									<Selector
										name="y2"
										label="Y2 axis"
										selected={yAxis}
										options={options}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
								<div className="col-md-1">
									<Selector
										name="type"
										label="Chart type"
										selected={type}
										options={chartTypeOptions}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
							</div>
						</div>

						<div className="panel-body" style={{position: 'relative', width: '100%', padding: '20%'}}>
							{this.getIFrame(objIds, linking, xAxis, yAxis, type, legendLabels)}
						</div>
					</div>
					: null
				}</div>
		);
	}
}

type Axes = {
	xAxis?: string
	yAxis?: string
	type?: 'line' | 'scatter'
}
const getAxes = (options: PreviewOption[], preview: Preview, specSettings: TsSetting): Axes => {
	const getColName = (colName: string) => {
		const option = options.find((opt: PreviewOption) => opt.colTitle === colName);
		return option ? option.colTitle : undefined;
	};

	return preview.items[0] && preview.items[0].hasKeyValPairs
		? {
			xAxis: getColName(specSettings.x as unknown as string) || preview.items[0].getUrlSearchValue('x'),
			yAxis: getColName(specSettings.y as unknown as string) || preview.items[0].getUrlSearchValue('y'),
			type: specSettings.type || preview.items[0].getUrlSearchValue('type')
		}
		: {xAxis: undefined, yAxis: undefined, type: undefined};
};

type SelectorProps = {
	name: string
	label: string
	selected?: string
	options: {colTitle: string, valTypeLabel: string}[]
	selectAction: (event: ChangeEvent<HTMLSelectElement>) => void
}
const Selector = (props: SelectorProps) => {
	const value = props.selected ? decodeURIComponent(props.selected) : '0';
	const getTxt = (option: PreviewOption) => {
		return option.colTitle === option.valTypeLabel
			? option.colTitle
			: `${option.colTitle}—${option.valTypeLabel}`;
	};

	return (
		<span>
			<label>{props.label}</label>
			<select name={props.name} className="form-control" onChange={props.selectAction} defaultValue={value}>
				<option value="0">Select option</option>
				{props.options.map((o: PreviewOption, i: number) =>
					<option value={o.colTitle} key={props.label.slice(0, 1) + i}>{getTxt(o)}</option>)}
			</select>
		</span>
	);
};

const getLegendLabels = (items: PreviewItem[]) => {
	return items.map(item => item.stationId && item.samplingHeight ? `${item.stationId} ${item.samplingHeight} m Level ${item.item.level}` : '').join(',');
};
