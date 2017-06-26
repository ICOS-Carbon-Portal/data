import React, { Component } from 'react';

export default class PreviewTimeSerie extends Component {
	constructor(props){
		super(props);
		this.axisOptions = undefined;
	}

	componentWillReceiveProps(nextProps){
		const prevItem = this.props.item;
		const nextItem = nextProps.item;
		const nextDobjColumns = nextProps.dobjColumns;

		if (nextItem && nextDobjColumns.length){
			const axisOptions = getDataFromCache('colTitle', getDataFromCache(nextItem.id, nextDobjColumns));

			if (axisOptions) {
				const xAxisSetting = axisOptions.find(ao => ao === 'TIMESTAMP');
				this.axisOptions = axisOptions;

				if(this.props.setCartItemSetting && xAxisSetting && !nextItem.settings.xAxis) {
					console.log("Save xAxis setting");
					this.props.setCartItemSetting(this.props.item.id, 'xAxis', xAxisSetting);
				}
			}
		}
	}

	handleSelectAction(ev){
		const setting = ev.target.name;
		const selectedIdx = ev.target.selectedIndex;
		const selectedVal = ev.target.selectedOptions[0].innerHTML;
		// console.log({id: this.props.item.id, setting, selectedVal, props: this.props});

		if(selectedIdx > 0 && this.props.setCartItemSetting) {
			this.props.setCartItemSetting(this.props.item.id, setting, selectedVal);
		}
	}

	render(){
		const {item} = this.props;
		const {xAxis, yAxis, type} = this.props.item
			? this.props.item.settings
			: {xAxis: undefined, yAxis: undefined, type: undefined};
		// console.log({item, dobjColumns, axisOptions: this.axisOptions, props: this.props, xAxis, yAxis, type});

		return (
			<div>
				{item && this.axisOptions
					? <div>
						<div className="panel panel-default">
							<div className="panel-heading">
								<h3 className="panel-title">Preview of {item.itemName}</h3>
							</div>
							<div className="panel-body">
								<div className="row">
									<Selector
										name="xAxis"
										label="X axis"
										selected={xAxis}
										options={this.axisOptions}
										selectAction={this.handleSelectAction.bind(this)}
									/>
									<Selector
										name="yAxis"
										label="Y axis"
										selected={yAxis}
										options={this.axisOptions}
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
									id={item.id}
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

function isArrEqual(arr1, arr2){
	return arr1 && arr2 && arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i]);
}

function getDataFromCache(name, cacheArr){
	return name && cacheArr
		? cacheArr.reduce((acc, curr) => {
			if (curr.name === name) acc = curr.data;
			return acc;
		}, undefined)
		: undefined;
}

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
