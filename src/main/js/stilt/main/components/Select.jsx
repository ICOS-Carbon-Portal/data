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

	onSelect(){
		const ddl = ReactDOM.findDOMNode(this.refs.selectelem);

		if (ddl.selectedIndex > 0){
			const idx = ddl.selectedIndex - 1;
			this.props.selectValue(this.props.dataList[idx]);
		}
	}

	render(){
		const props = this.props;

		return (
			props.availableValues.length > 0
				? <select ref="selectelem" value={props.value} className="form-control" onChange={this.onSelect.bind(this)}>
					<option key="select">{props.infoTxt}</option>
					{
						props.availableValues.map(value => {
							return <option key={value} value={value}>{value}</option>;
						})
					}
				</select>
				: null
		);
	}
}

