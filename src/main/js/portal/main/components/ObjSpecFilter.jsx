import React, { Component, Fragment } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';
import {placeholders} from '../config';
import Slider from './ui/Slider.jsx';


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
			return props.text;
		} else if (start === 0) {
			return (
				<Fragment>
					<strong>{props.text.slice(start, start + searchStr.length)}</strong>
					<span>{props.text.slice(start + searchStr.length)}</span>
				</Fragment>
			);
		} else {
			return (
				<Fragment>
					<span>{props.text.slice(0, start - 1)}</span>
					<strong>{props.text.slice(start, start + searchStr.length)}</strong>
					<span>{props.text.slice(start + searchStr.length)}</span>
				</Fragment>
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
		const resetBtnEnabled = !!filters.reduce((acc, curr) => {
			return acc + curr.length;
		}, 0);

		return (
			<div>
				<ResetBtn enabled={resetBtnEnabled} resetFiltersAction={specFiltersReset} />

				<FilterPanel
					header="Data origin"
					nameList={['isIcos', 'theme', 'station', 'submitter']}
					colNames={colNames}
					getCtrl={this.getCtrl.bind(this)}
					startCollapsed={false}
				/>

				<FilterPanel
					header="Data types"
					nameList={['specLabel', 'level', 'format']}
					colNames={colNames}
					getCtrl={this.getCtrl.bind(this)}
					startCollapsed={false}
				/>

				<FilterPanel
					header="Value types"
					nameList={['colTitle', 'valType', 'quantityUnit', 'quantityKind']}
					colNames={colNames}
					getCtrl={this.getCtrl.bind(this)}
					startCollapsed={false}
				/>


			</div>
		);
	}
}

const FilterPanel = ({header, nameList, colNames, getCtrl, startCollapsed = false}) => {
	if (colNames.length === 0) return null;

	return (
		<div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">{header}</h3>
			</div>

			<Slider startCollapsed={startCollapsed}>
				<div className="panel-body" style={{paddingTop:0}}>
					{nameList.map(name => getCtrl(name))}
				</div>
			</Slider>
		</div>
	);
};

const ResetBtn = ({resetFiltersAction, enabled}) => {
	const className = enabled ? 'btn btn-primary' : 'btn btn-primary disabled';
	const style = enabled
		? {marginBottom: 15, cursor: 'pointer'}
		: {marginBottom: 15};
	const onClick = enabled ? resetFiltersAction : () => _;

	return <button className={className} style={style} onClick={onClick}>Clear categories</button>;
};
