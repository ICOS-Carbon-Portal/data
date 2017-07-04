import React, { Component } from 'react';

export default class PreviewTimeSerie extends Component {
	constructor(props){
		super(props);
	}

	handleSelectAction(ev){
		const selectedIdx = ev.target.selectedIndex;

		if (selectedIdx > 0 && this.props.setPreviewItemSetting) {
			const id = this.props.preview.previewItem.id;
			const setting = ev.target.name;
			const selectedVal = ev.target.selectedOptions[0].innerHTML;

			this.props.setPreviewItemSetting(id, setting, selectedVal);
		}
	}

	render(){
		const {preview, closePreviewAction, setPreviewItemSetting} = this.props;
		const {xAxis, yAxis, type} = preview.previewItem
			? preview.previewItem.settings
			: {xAxis: undefined, yAxis: undefined, type: undefined};

		return (
			<div>
				{preview
					? <div>
						<div className="panel panel-default">
							<div className="panel-heading">
								<span className="panel-title">Preview of {preview.previewItem.itemName}</span>
								<CloseBtn closePreviewAction={closePreviewAction} />
							</div>
							<div className="panel-body">
								<div className="row">
									<Selector
										name="xAxis"
										label="X axis"
										selected={xAxis}
										options={preview.previewOptions.options}
										selectAction={this.handleSelectAction.bind(this)}
									/>
									<Selector
										name="yAxis"
										label="Y axis"
										selected={yAxis}
										options={preview.previewOptions.options}
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
									id={preview.previewItem.id}
									x={xAxis}
									y={yAxis}
									type={type}
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
	const {x, y, type} = props;

	return (
		<div>{
			x && y
				? <iframe
					style={{border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'}}
					src={`https://data.icos-cp.eu/dygraph-light/?objId=${objId}&x=${x}&y=${y}&type=${type}`}
				/>
				: null
		}</div>
	);
};
