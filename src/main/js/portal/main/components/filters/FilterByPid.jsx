import React, { Component } from 'react';
import {Combobox} from 'react-widgets';


const minLength = 3;

export default class FilterByPid extends Component{
	constructor(props){
		super(props);
	}

	handleChange(selected){
		// if (this.props.updateFilter) this.props.updateFilter('dobj', selected);
		console.log({selected});
	}

	handleSearch(searchStr){
		if (searchStr.length >= minLength && this.props.queryMeta) {
			console.log({searchStr});
			this.props.queryMeta('dobj', searchStr, minLength);
		}
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
		console.log({props});

		return (
			<div className="row" style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>PID</label>
					<Combobox
						placeholder="Search by PID"
						// valueField="text"
						// textField="text"
						data={props.filterPids}
						// value={this.props.specTable.getFilter(name)}
						filter="contains"
						onChange={this.handleChange.bind(this)}
						onChange={this.handleSearch.bind(this)}
						// itemComponent={this.listItem.bind(this)}
						// tagComponent={this.tagItem}
					/>
				</div>
			</div>
		);
	}
}