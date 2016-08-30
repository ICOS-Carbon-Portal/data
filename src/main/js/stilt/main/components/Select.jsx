import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Select extends Component {
	constructor(props){
		super(props);
	}

	changeHandler(){
		const ddl = ReactDOM.findDOMNode(this.refs.selectelem);

		if (ddl.selectedIndex > 0){
			this.props.selectValue(ddl.value);
		}
	}

	render(){
		const props = this.props;
		return <select ref="selectelem" value={props.value} className="form-control" onChange={this.changeHandler.bind(this)}>
			<option key="select">Select year</option>
			{
				props.availableValues.map(value => {
					return <option key={value} value={value}>{value}</option>;
				})
			}
		</select>;
	}
}

