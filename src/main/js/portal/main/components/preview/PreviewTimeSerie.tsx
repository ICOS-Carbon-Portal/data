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
		const {name, selectedIndex, options} = ev.target;

		if ((selectedIndex > 0 || name === 'y2') && iframeSrcChange) {
			if (selectedIndex === 0){
				preview.items[0].deleteKeyValPair(name);
			}
			const keyVal = selectedIndex === 0
				? {}
				: {[name]: options[selectedIndex].value};
			const newUrl = preview.items[0].getNewUrl(keyVal);
			iframeSrcChange({target: {src: newUrl}} as ChangeEvent<HTMLIFrameElement>);

			if (this.iframe && this.iframe.contentWindow) {
				this.iframe.contentWindow.postMessage(newUrl, "*");
			}

			if (selectedIndex > 0)
				storeTsPreviewSetting(preview.item.spec, name, options[selectedIndex].value);
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
		const verbatimMatch = preview.options.find(opt => opt.varTitle === actColName);
		if(verbatimMatch) return verbatimMatch;
		const regexMatch = preview.options.find((opt: PreviewOption) => wholeStringRegExp(opt.varTitle).test(actColName));
		if(!regexMatch) return; //no preview for columns that are not in portal app's metadata (e.g. flag columns)
		return {...regexMatch, varTitle: actColName};
	}

	render(){
		const {preview, extendedDobjInfo, tsSettings} = this.props;

		// Add station information
		const items: PreviewItem[] = preview.items.map((item: PreviewItem) => {
			const extendedInfo = this.props.extendedDobjInfo.find(ext => ext.dobj === item.dobj);
			item.station = extendedInfo ? extendedInfo.station : undefined;
			item.stationId = extendedInfo ? extendedInfo.stationId : undefined;
			item.samplingHeight = extendedInfo ? extendedInfo.samplingHeight : undefined;
			item.columnNames = extendedInfo ? extendedInfo.columnNames : undefined;
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
			: preview.options;

		const chartTypeOptions: PreviewOption[] = [
			{varTitle: 'scatter', valTypeLabel: 'scatter'},
			{varTitle: 'line', valTypeLabel: 'line'},
		];

		const specSettings: TsSetting = tsSettings[preview.item.spec] || {} as TsSetting;
		const {xAxis, yAxis, type} = getAxes(options, preview, specSettings);
		const objIds = preview.items.map((i: CartItem) => getLastSegmentInUrl(i.dobj)).join();

		if (!preview)
			return null;

		return (
			<>
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
							options={options}
							selectAction={this.handleSelectAction.bind(this)}
						/>
					</div>
					<div className="col-md-3">
						<Selector
							name="type"
							label="Chart type"
							selected={type}
							options={chartTypeOptions}
							selectAction={this.handleSelectAction.bind(this)}
						/>
					</div>
				</div>

				<div className="row" style={{position: 'relative', width: '100%', padding: '20%'}}>
					{this.getIFrame(objIds, linking, xAxis, yAxis, type, legendLabels)}
				</div>
			</>
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
		const option = options.find((opt: PreviewOption) => opt.varTitle === colName);
		return option ? option.varTitle : undefined;
	};

	return preview.items[0] && preview.items[0].hasKeyValPairs
		? {
			xAxis: getColName(specSettings.x as unknown as string) || preview.items[0].getUrlSearchValue('x'),
			yAxis: getColName(specSettings.y as unknown as string) || preview.items[0].getUrlSearchValue('y'),
			type: specSettings.type || preview.items[0].getUrlSearchValue('type') as Axes['type']
		}
		: {xAxis: undefined, yAxis: undefined, type: undefined};
};

type SelectorProps = {
	name: string
	label: string
	selected?: string
	options: PreviewOption[]
	selectAction: (event: ChangeEvent<HTMLSelectElement>) => void
}
const Selector = (props: SelectorProps) => {
	const value = props.selected ? decodeURIComponent(props.selected) : '0';
	const getTxt = (option: PreviewOption) => {
		return option.varTitle === option.valTypeLabel
			? option.varTitle
			: `${option.varTitle}—${option.valTypeLabel}`;
	};

	return (
		<span>
			<label>{props.label}</label>
			<select name={props.name} className="form-select" onChange={props.selectAction} defaultValue={value}>
				<option value="0">Select option</option>
				{props.options.map((o: PreviewOption, i: number) =>
					<option value={o.varTitle} key={props.label.slice(0, 1) + i}>{getTxt(o)}</option>)}
			</select>
		</span>
	);
};

const getLegendLabels = (items: PreviewItem[]) => {
	return items.map(item => item.stationId && item.samplingHeight ? `${item.stationId} ${item.samplingHeight} m Level ${item.level}` : '').join(',');
};
