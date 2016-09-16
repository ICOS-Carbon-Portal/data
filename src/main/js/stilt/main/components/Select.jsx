import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Select extends Component {
	constructor(props){
		super(props);
	}

	changeHandler(){
		const ddl = ReactDOM.findDOMNode(this.refs.selectelem);

		if (ddl.selectedIndex > 0){
			const idx = ddl.selectedIndex - 1;
			this.props.selectValue(this.props.availableValues[idx]);
		}
	}

	render(){
		const props = this.props;
		return <select ref="selectelem" value={this.stringValue(props.value)} className="form-control" onChange={this.changeHandler.bind(this)} {...props.options}>
			<option key="select">{this.props.infoTxt}</option>
			{
				(this.props.availableValues || [])
					.map(this.stringValue.bind(this))
					.map(value => <option key={value} value={value}>{value}</option>)
			}
		</select>;
	}

	stringValue(complexValue){
		return this.props.presenter ? this.props.presenter(complexValue) : complexValue;
	}
}

