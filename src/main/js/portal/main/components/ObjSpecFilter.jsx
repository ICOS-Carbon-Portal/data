import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';
import {placeholders} from '../config';


export default class ObjSpecFilter extends Component {
	constructor(props) {
		super(props);
		this.search = Object.assign({}, placeholders);
		Object.keys(this.search).forEach(v => this.search[v] = undefined);
	}

	getCtrl(name){
		const data = this.props.specTable
			? this.props.specTable.getDistinctAvailableColValues(name)
				.map(text => {return {text};})
			: [];

		if (data[0]) {
			typeof data[0].text === "string"
				? data.sort((d1, d2) => d1.text.localeCompare(d2.text))
				: data.sort((d1, d2) => d1.text > d2.text);
		}

		const placeholder = data.length === 1
			? `${data[0].text}`
			: `(${data.length} items)`;

		return (
			<div className="row" key={name} style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>{placeholders[name]}</label>
					<Multiselect
						placeholder={placeholder}
						valueField="text"
						textField="text"
						data={data}
						value={this.props.specTable.getFilter(name)}
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

	handleChange(name, values){
		this.props.updateFilter(name, values.map(v => typeof v === 'object' ? v.text : v));
	}

	handleSearch(name, value){
		this.search[name] = value;
	}

	render(){
		const {specTable, specFiltersReset} = this.props;
		const colNames = specTable.names.filter(name => !!placeholders[name]);
		const filters = colNames.map(colName => specTable.getFilter(colName));
		const showResetBtn = !!filters.reduce((acc, curr) => {
			return acc + curr.length;
		}, 0);

		return (
			<div>
				{showResetBtn
					? <ResetBtn resetFiltersAction={specFiltersReset} />
					: null
				}
				{colNames.map(name => this.getCtrl(name))}
			</div>
		);

		// return <div className="panel panel-default">
		// 	<div className="panel-heading">
		// 		<h3 style={{display: 'inline'}} className="panel-title">Data object specification filter</h3>
		// 		{showResetBtn
		// 			? <ResetBtn resetFiltersAction={specFiltersReset} />
		// 			: null
		// 		}
		// 	</div>
		// 	<div className="panel-body">
		// 		{colNames.map(name => this.getCtrl(name))}
		// 	</div>
		// </div>;
	}
}

const ResetBtn = props => {
	return <div
		className="glyphicon glyphicon-ban-circle"
		style={{display: 'inline', float: 'right', fontSize: '160%', cursor: 'pointer'}}
		title="Clear all filters"
		onClick={props.resetFiltersAction}
	/>;
};
