import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { PropertyValueFilter, EmptyFilter } from '../models/Filters';

class PropertyValueSelect extends Component {
	constructor(props){
		super(props);
		this.filterUpdate = this.filterUpdate.bind(this);
		this.filterReset = this.filterReset.bind(this);
	}

	filterUpdate(){
		const prop = this.props.prop;
		const value = ReactDOM.findDOMNode(this.refs.select).value;
		const filter = new PropertyValueFilter(prop, value);
		this.props.filterUpdate(prop, filter);
	}

	filterReset(){
		const prop = this.props.prop;
		const filter = new EmptyFilter(true);
		this.props.filterUpdate(prop, filter);
	}

	render() {
		const props = this.props;
		const [valueLabels, value] = makeValueLabels(props.valueCounts, props.filter);

		const buttDisabled = props.filter.isEmpty();
		const buttClass = buttDisabled ? 'default' : 'primary';

		return <div className="row">
			<div className="col-md-1">
				<label>{props.label}</label>
			</div>
			<div className="col-md-10">
				<select ref="select" className="form-control" value={value} onChange={this.filterUpdate}>{
					valueLabels.map(
						({value, label}, i) => <option key={i} value={value}>{label}</option>
					)
				}</select>
			</div>
			<div className="col-md-1">
				<button type="button" disabled={buttDisabled} className={"btn btn-" + buttClass} onClick={this.filterReset}>Reset</button>
			</div>
		</div>;
	}
}

function makeValueLabels(valueCounts, filter){
	if(!valueCounts) return [
		[{value: null, label: "(None)"}],
		null
	];

	const valLabels = valueCounts.map(({value, count}) => {
		return {
			value,
			label: `${value} (${count})`
		};
	});

	if(!filter.isEmpty()) return [valLabels, filter.value];
	else {
		const longSummary = valLabels.slice(0, 40).map(vl => vl.label).join(' | ');
		const summary = longSummary.length < 200 ? longSummary : longSummary.substring(0, 196) + " ...";
		const finalValLabels = [{value: null, label: summary}].concat(valLabels);
		return [finalValLabels, null];
	}
}

export default PropertyValueSelect;

