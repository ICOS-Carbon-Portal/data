import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

const placeholders = {
	specLabel: 'Specification',
	level: 'Data level',
	format: 'Format',
	colTitle: 'Column name',
	valType: 'Value type',
	quantityKind: 'Quantity kind',
	quantityUnit: 'Unit',
	submitter: 'Data submitter',
	station: 'Station of origin',
	isIcos: 'ICOS / non-ICOS data'
};

export default class ObjSpecFilter extends Component {
	constructor(props) {
		super(props);
		this.search = Object.assign({}, placeholders);
		Object.keys(this.search).forEach(v => this.search[v] = undefined);
	}

	getCtrl(name){
		const data = this.props.specTable
			? this.props.specTable.getDistinctColValues(name)
				.map(text => {return {text};})
			: [];

		if (data[0]) {
			typeof data[0].text === "string"
				? data.sort((d1, d2) => d1.text.localeCompare(d2.text))
				: data.sort((d1, d2) => d1.text > d2.text);
		}

		const placeholder = data.length == 1
		 ? `${placeholders[name]}: ${data[0].text}`
		 : `${placeholders[name]} (${data.length} items)`;

		return (
			<div className="row" key={name} style={{marginTop: 10}}>
				<div className="col-md-6">
					<Multiselect
						placeholder={placeholder}
						valueField="text"
						textField="text"
						data={data}
						filter="contains"
						onChange={this.handleChange.bind(this, name)}
						onSearch={this.handleSearch.bind(this, name)}
						itemComponent={this.listItem.bind(this, name)}
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

	handleChange(name, values){
		this.props.updateFilter(name, values.map(v => v.text));
	}

	handleSearch(name, value){
		this.search[name] = value;
	}

	render(){
		const specTable = this.props.specTable;
		const colNames = specTable.names.filter(name => !!placeholders[name]);
		const originsTable = specTable.getTable('origins');
		const count = originsTable
			? originsTable.filteredRows.reduce((acc, next) => acc + (next.count || 0), 0)
			: 0;

		return <div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">Data object specification filter</h3>
			</div>
			<div className="panel-body">
				<div>
					<div className="row">
						<div className="col-md-2"><label>Total object count</label></div>
						<div className="col-md-2"><span className="label label-default">{count}</span></div>
					</div>
					<div>{colNames.map(name => this.getCtrl(name, specTable))}</div>
				</div>
			</div>
		</div>;
	}
}

