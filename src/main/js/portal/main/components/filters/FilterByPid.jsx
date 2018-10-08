import React, { Component } from 'react';
import {Multiselect} from 'react-widgets';
import {debounce} from 'icos-cp-utils';


const minLength = 3;

export default class FilterByPid extends Component{
	constructor(props){
		super(props);

		this.search = undefined;
		this.makeQueryDebounced = debounce(this.makeQuery.bind(this));
	}

	handleChange(pidsArr){
		this.props.updateSelectedPids(pidsArr);
	}

	handleSearch(pidStr){
		this.search = pidStr;

		if (pidStr.length >= minLength) {
			this.makeQueryDebounced(pidStr);
		}
	}

	makeQuery(pidStr){
		this.setState({busy: true});
		this.props.queryMeta('dobj', pidStr);
	}

	listItem(props){
		const text = props.text.toLowerCase();
		const searchStr = this.search ? this.search.toLowerCase() : undefined;
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

	render(){
		const {pidList, selectedPids} = this.props;

		return (
			<div className="row" style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>PID</label>
					<Multiselect
						placeholder="Search by PID"
						data={pidList}
						value={selectedPids}
						filter="contains"
						onChange={this.handleChange.bind(this)}
						onSearch={this.handleSearch.bind(this)}
						itemComponent={this.listItem.bind(this)}
					/>
				</div>
			</div>
		);
	}
}
