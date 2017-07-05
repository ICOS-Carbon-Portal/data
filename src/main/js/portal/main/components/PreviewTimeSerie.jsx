import React, { Component } from 'react';
import CopyUrl from './CopyUrl.jsx';

export default class PreviewTimeSerie extends Component {
	constructor(props){
		super(props);
		this.state = {
			iframeSrc: undefined
		};
		this.iframeSrcChange = this.handleIframeSrcChange.bind(this);
		window.onmessage = event => this.handleIframeSrcChange(event);
	}

	handleSelectAction(ev){
		const selectedIdx = ev.target.selectedIndex;

		if (selectedIdx > 0 && this.props.setPreviewItemSetting) {
			const id = this.props.preview.item.id;
			const setting = ev.target.name;
			const selectedVal = ev.target.selectedOptions[0].innerHTML;

			this.props.setPreviewItemSetting(id, setting, selectedVal);
		}
	}

	handleIframeSrcChange(event){
		const iframeSrc = event instanceof MessageEvent ? event.data : event.target.src;
		this.setState({iframeSrc});
	}

	componentWillUnmount(){
		this.iframe.removeEventListener('load', this.iframeSrcChange);
	}

	render(){
		const {preview, closePreviewAction} = this.props;
		const {xAxis, yAxis, type} = preview.item
			? preview.item.settings
			: {xAxis: undefined, yAxis: undefined, type: undefined};

		return (
			<div>
				{preview
					? <div>
						<div className="panel panel-default">

							<div className="panel-heading">
								<span className="panel-title">Preview of {preview.item.itemName}</span>
								<CloseBtn closePreviewAction={closePreviewAction} />
								<CopyUrl iframeSrc={this.state.iframeSrc}/>
							</div>

							<div className="panel-body">
								<div className="row">
									<Selector
										name="xAxis"
										label="X axis"
										selected={xAxis}
										options={preview.options}
										selectAction={this.handleSelectAction.bind(this)}
									/>
									<Selector
										name="yAxis"
										label="Y axis"
										selected={yAxis}
										options={preview.options}
										selectAction={this.handleSelectAction.bind(this)}
									/>
									<Selector
										name="type"
										label="Chart type"
										selected={type}
										options={['scatter', 'line']}
										selectAction={this.handleSelectAction.bind(this)}
									/>
								</div>
							</div>
							<div className="panel-body" style={{position: 'relative', width: '100%', padding: '20%'}}>
								<TimeSeries
									self={this}
									id={preview.item.id}
									x={xAxis}
									y={yAxis}
									type={type}
									onLoad={this.iframeSrcChange}
								/>
							</div>
						</div>
					</div>
					: null
				}</div>
		);
	}
}

const CloseBtn = props => {
	if (props.closePreviewAction){
		return <span
			className="glyphicon glyphicon-remove-sign"
			style={{float: 'right', fontSize: '170%', cursor: 'pointer'}}
			title="Close preview"
			onClick={props.closePreviewAction}
		/>;
	} else {
		return <span />;
	}
};

const Selector = props => {
	return (
		<div className="col-md-4">
			<label>{props.label}</label>
			<select name={props.name} className="form-control" onChange={props.selectAction} value={props.selected ? props.selected : '0'}>
				<option value="0">Select option</option>{
				props.options.map((o, i) => <option value={o} key={props.label.slice(0, 1) + i}>{o}</option>)
			}</select>
		</div>
	);
};

const TimeSeries = props => {
	const objId = props.id.split('/').pop();
	const {self, x, y, type} = props;

	return (
		<div>{
			x && y
				? <iframe ref={iframe => self.iframe = iframe} onLoad={props.onLoad}
					style={{border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'}}
					src={`http://127.0.0.1:9010/netcdf-light/?service=yearly_1x1_fluxes_limited.nc&varName=bio_flux_opt&date=2001-07-01T17:04:15.484Z&elevation=&gamma=1`}
					// src={`https://data.icos-cp.eu/dygraph-light/?objId=${objId}&x=${x}&y=${y}&type=${type}`}
				/>
				: null
		}</div>
	);
};
