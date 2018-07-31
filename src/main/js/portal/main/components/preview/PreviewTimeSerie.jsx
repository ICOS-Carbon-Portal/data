import React, { Component } from 'react';
import config from '../../config.js';

export default class PreviewTimeSerie extends Component {
	constructor(props){
		super(props);
	}

	handleSelectAction(ev){
		const {preview, iframeSrcChange} = this.props;
		const selectedIdx = ev.target.selectedIndex;

		if (selectedIdx > 0 && iframeSrcChange) {
			const selectedVal = ev.target.options[selectedIdx].innerHTML;
			const setting = ev.target.name;
			const newUrl = preview.items[0].getNewUrl({[setting]: selectedVal});

			iframeSrcChange({target: {src: newUrl}});
		}
	}

	render(){
		const {preview, iframeSrcChange} = this.props;
		const {xAxis, yAxis, type} = preview.items[0] && preview.items[0].hasKeyValPairs
			? {
				xAxis: preview.items[0].getUrlSearchValue('x'),
				yAxis: preview.items[0].getUrlSearchValue('y'),
				type: preview.items[0].getUrlSearchValue('type')
			}
			: {xAxis: undefined, yAxis: undefined, type: undefined};

		const linking = preview.items.reduce((acc,cur) => {
			const result = preview.items.reduce((acc2,cur2) => {
				if (cur.id !== cur2.id) {
					if (cur._dataobject.timeStart < cur2._dataobject.timeStart
						&& cur._dataobject.timeEnd < cur2._dataobject.timeEnd) {
							return 'concatenate';
					}
					else if (cur._dataobject.timeStart > cur2._dataobject.timeStart
						&& cur._dataobject.timeEnd > cur2._dataobject.timeEnd) {
							return 'concatenate';
					}
				}
				return acc2;
			}, 'overlap');
			return result;
		}, '');

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
										options={filterOptions(preview.options)}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
								<div className="col-md-4">
									<Selector
										name="y"
										label="Y axis"
										selected={yAxis}
										options={filterOptions(preview.options)}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
								<div className="col-md-4">
									<Selector
										name="type"
										label="Chart type"
										selected={type}
										options={['scatter', 'line']}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
							</div>
						</div>

						<div className="panel-body" style={{position: 'relative', width: '100%', padding: '20%'}}>
							<TimeSeries
								self={this}
								ids={preview.items.map(i => i.id)}
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

const filterOptions = options => {
	return options.filter(opt => !opt.startsWith('Flag'));
};

const Selector = props => {
	const value = props.selected ? decodeURIComponent(props.selected) : '0';

	return (
		<span>
			<label>{props.label}</label>
			<select name={props.name} className="form-control" onChange={props.selectAction} value={value}>
				<option value="0">Select option</option>{
				props.options.map((o, i) => <option value={o} key={props.label.slice(0, 1) + i}>{o}</option>)
			}</select>
		</span>
	);
};

const TimeSeries = props => {
	const objIds = props.ids.map(id => id.split('/').pop()).join();
	const {self, x, y, type, linking} = props;

	return (
		<div>{
			x && y
				? <iframe ref={iframe => self.iframe = iframe} onLoad={props.onLoad}
					style={{border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'}}
					src={`${config.iFrameBaseUrl[config.TIMESERIES]}?objId=${objIds}&x=${x}&y=${y}&type=${type}&linking=${linking}`}
				/>
				: null
		}</div>
	);
};
