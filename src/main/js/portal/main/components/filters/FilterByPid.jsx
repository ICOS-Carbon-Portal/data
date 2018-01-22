import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';


export default class FilterByPid extends Component{
	constructor(props){
		super(props);
	}

	handleChange(){

	}

	handleSearch(){

	}

	listItem(name, props){
		const text = props.text.toLowerCase();
		const searchStr = this.search[name] ? this.search[name].toLowerCase() : undefined;
		const start = text.indexOf(searchStr);

		if (start < 0) {
			return <span>{props.text}</span>;
		} else if (start === 0) {
			return (
				<span>
					<strong>{props.text.slice(start, start + searchStr.length)}</strong>
					<span>{props.text.slice(start + searchStr.length)}</span>
				</span>
			);
		} else {
			return (
				<span>
					<span>{props.text.slice(0, start - 1)}</span>
					<strong>{props.text.slice(start, start + searchStr.length)}</strong>
					<span>{props.text.slice(start + searchStr.length)}</span>
				</span>
			);
		}
	}

	tagItem({item}){
		const textItem = typeof item === 'object' ? item : {text: item};

		return typeof item === 'object'
			? <span style={{marginRight: 2}}>{textItem.text}</span>
			: <span style={{marginRight: 2, color: 'gray'}} title="Not present with current filters">{textItem.text}</span>;
	}

	render(){
		const props = this.props;
		const data = [];
		const name = '';
		// console.log({props});

		return (
			<div className="row" style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>PID</label>
					<Multiselect
						placeholder="Search by PID"
						valueField="text"
						textField="text"
						data={data}
						// value={this.props.specTable.getFilter(name)}
						filter="contains"
						onChange={this.handleChange.bind(this, name)}
						onSearch={this.handleSearch.bind(this, name)}
						itemComponent={this.listItem.bind(this, name)}
						tagComponent={this.tagItem}
					/>
				</div>
			</div>
		);
	}
}