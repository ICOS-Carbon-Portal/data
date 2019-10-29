import React, { Component } from 'react';
import config from '../../config.js';

export default class PreviewTimeSerie extends Component {
	constructor(props){
		super(props);
	}

	handleSelectAction(ev){
		const {preview, iframeSrcChange, storeTsPreviewSetting} = this.props;
		const selectedIdx = ev.target.selectedIndex;

		if (selectedIdx > 0 && iframeSrcChange) {
			const selectedVal = ev.target.options[selectedIdx].value;
			const setting = ev.target.name;
			const newUrl = preview.items[0].getNewUrl({[setting]: selectedVal});

			iframeSrcChange({target: {src: newUrl}});
			this.iframe.contentWindow.postMessage(newUrl, "*");

			storeTsPreviewSetting(preview.item.spec, setting, selectedVal);
		}
	}

	shouldComponentUpdate(nextProps) {
		return this.props.extendedDobjInfo.length === 0 && nextProps.extendedDobjInfo.length > 0;
	}

	render(){
		const {preview, extendedDobjInfo, iframeSrcChange, tsSettings} = this.props;

		// Add station information
		const items = preview.items.map((item) => {
			const extendedInfo = this.props.extendedDobjInfo.find(ext => ext.dobj === item.id);
			item.station = extendedInfo ? extendedInfo.station : null;
			item.stationId = extendedInfo ? extendedInfo.stationId : null;
			item.samplingHeight = extendedInfo ? extendedInfo.samplingHeight : null;
			item.columnNames = extendedInfo ? extendedInfo.columnNames : null;
			return item;
		});

		// Determine if curves should concatenate or overlap
		const linking = items.reduce((acc,cur) => {
			return items.reduce((acc2,cur2) => {
				if ((cur.id !== cur2.id) &&
					(cur.station === cur2.station) &&
					((cur.timeEnd < cur2.timeStart) ||
					(cur.timeStart > cur2.timeEnd)) &&
					(!cur.samplingHeight || cur.samplingHeight === cur2.samplingHeight)) {
					return 'concatenate';
				}
				return acc2;
			}, 'overlap');
		}, '');

		const allItemsHaveColumnNames = items.reduce((acc, cur) =>{
			return !!(acc && cur.columnNames);
		}, true);

		const legendLabels = extendedDobjInfo.length > 0 ? getLegendLabels(items) : undefined;
		const options = filterOptions(allItemsHaveColumnNames
			? [...new Set([...items.flatMap(item => item.columnNames)])]
				.map(colName =>
					Object.assign({},
						preview.options.find(opt => new RegExp(opt.colTitle).test(colName)),
						{colTitle: colName}
					)
				)
			: preview.options);
		const chartTypeOptions = [
			{colTitle: 'scatter', valTypeLabel: 'scatter'},
			{colTitle: 'line', valTypeLabel: 'line'},
		];

		const specSettings = tsSettings[preview.item.spec] || {};
		const {xAxis, yAxis, type} = getAxes(options, preview, specSettings);

		return (
			<div>
				{preview
					? <div>

						<div className="panel-body" style={{paddingTop: 0}}>
							<div className="row">
								<div className="col-md-4">
									<Selector
										name="x"
										label="X axis"
										selected={xAxis}
										options={options}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
								<div className="col-md-4">
									<Selector
										name="y"
										label="Y axis"
										selected={yAxis}
										options={options}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
								<div className="col-md-4">
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
							<TimeSeries
								self={this}
								ids={preview.items.map(i => i.id)}
								legendLabels={legendLabels}
								x={xAxis}
								y={yAxis}
								type={type}
								linking={linking}
								onLoad={iframeSrcChange}
							/>
						</div>
					</div>
					: null
				}</div>
		);
	}
}

const getAxes = (options, preview, specSettings) => {
	const getColName = colName => {
		const option = options.find(opt => opt.colTitle === colName);
		return option ? option.colTitle : undefined;
	};

	return preview.items[0] && preview.items[0].hasKeyValPairs
		? {
			xAxis: getColName(specSettings.x) || preview.items[0].getUrlSearchValue('x'),
			yAxis: getColName(specSettings.y) || preview.items[0].getUrlSearchValue('y'),
			type: specSettings.type || preview.items[0].getUrlSearchValue('type')
		}
		: {xAxis: undefined, yAxis: undefined, type: undefined};
};

const filterOptions = options => {
	return options.filter(opt => !opt.colTitle.startsWith('Flag'));
};

const Selector = props => {
	const value = props.selected ? decodeURIComponent(props.selected) : '0';
	const getTxt = option => {
		return option.colTitle === option.valTypeLabel
			? option.colTitle
			: `${option.colTitle}—${option.valTypeLabel}`;
	};

	return (
		<span>
			<label>{props.label}</label>
			<select name={props.name} className="form-control" onChange={props.selectAction} defaultValue={value}>
				<option value="0">Select option</option>
				{props.options.map((o, i) =>
					<option value={o.colTitle} key={props.label.slice(0, 1) + i}>{getTxt(o)}</option>)}
			</select>
		</span>
	);
};

const TimeSeries = props => {
	const objIds = props.ids.map(id => id.split('/').pop()).join();
	const {self, x, y, type, linking, legendLabels} = props;
	const yParam = y ? `&y=${y}` : '';
	const legendLabelsParams = legendLabels ? `&legendLabels=${legendLabels}` : '';

	return <iframe ref={iframe => self.iframe = iframe} onLoad={props.onLoad}
		style={{border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'}}
		src={`${config.iFrameBaseUrl[config.TIMESERIES]}?objId=${objIds}&x=${x}${yParam}&type=${type}&linking=${linking}${legendLabelsParams}`}
	/>;
};

const getLegendLabels = items => {
	return items.map(item => item.stationId && item.samplingHeight ? `${item.stationId} ${item.samplingHeight} m Level ${item.item.level}` : '').join(',');
};
