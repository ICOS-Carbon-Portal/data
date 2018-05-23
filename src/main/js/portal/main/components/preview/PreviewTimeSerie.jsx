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
			const newUrl = preview.item.getNewUrl({[setting]: selectedVal});

			iframeSrcChange({target: {src: newUrl}});
		}
	}

	render(){
		const {preview, iframeSrcChange} = this.props;
		const {xAxis, yAxis, type} = preview.item && preview.item.hasKeyValPairs
			? {
				xAxis: preview.item.getUrlSearchValue('x'),
				yAxis: preview.item.getUrlSearchValue('y'),
				type: preview.item.getUrlSearchValue('type')
			}
			: {xAxis: undefined, yAxis: undefined, type: undefined};

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
								id={preview.item.id}
								x={xAxis}
								y={yAxis}
								type={type}
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
	const objId = props.id.split('/').pop();
	const {self, x, y, type} = props;
	const host = props.id.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1].replace('meta', 'data');

	return (
		<div>{
			x && y
				? <iframe ref={iframe => self.iframe = iframe} onLoad={props.onLoad}
					style={{border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'}}
					src={`${config.iFrameBaseUrl[config.TIMESERIES]}?objId=${objId}&x=${x}&y=${y}&type=${type}`}
				/>
				: null
		}</div>
	);
};
