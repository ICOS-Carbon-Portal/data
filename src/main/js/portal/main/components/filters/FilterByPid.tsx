import React, { Component } from 'react';
import {Multiselect} from 'react-widgets';
import {debounce} from 'icos-cp-utils';
import { Sha256Str } from '../../backend/declarations';
import { searchDobjs } from '../../backend';


const minLength = 3;

interface PidFilterProps {
	selectedPids: Sha256Str[]
	updateSelectedPids: (pidsArr: Sha256Str[]) => void
}

interface PidFilterState{
	pidList: Sha256Str[]
}

export default class FilterByPid extends Component<PidFilterProps, PidFilterState>{
	private readonly makeQueryDebounced: (q: string) => void;
	private search: string | undefined;

	constructor(props: PidFilterProps){
		super(props);
		this.state = {pidList: []};
		this.makeQueryDebounced = debounce(this.makeQuery.bind(this));
	}

	handleChange(pidsArr: Sha256Str[]){
		this.props.updateSelectedPids(pidsArr);
	}

	handleSearch(pidStr: string){
		this.search = pidStr;

		if (pidStr.length >= minLength) {
			this.makeQueryDebounced(pidStr);
		}
	}

	private makeQuery(pidStr: string){
		searchDobjs(pidStr).then(dobjs => {
			this.setState({
				pidList: dobjs.map(d => d.dobj)
			})
		})
	}

	listItem(props: {text: string}){
		const text = props.text.toLowerCase();
		const start = this.search === undefined ? -1 : text.indexOf(this.search.toLowerCase());
		const searchLen = this.search?.length || 0;

		if (start < 0) {
			return <span>{props.text}</span>;
		} else if (start === 0) {
			return (
				<span>
					<strong>{props.text.slice(start, start + searchLen)}</strong>
					<span>{props.text.slice(start + searchLen)}</span>
				</span>
			);
		} else {
			return (
				<span>
					<span>{props.text.slice(0, start - 1)}</span>
					<strong>{props.text.slice(start, start + searchLen)}</strong>
					<span>{props.text.slice(start + searchLen)}</span>
				</span>
			);
		}
	}

	render(){
		const {selectedPids} = this.props;
		const {pidList} = this.state;

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
						renderListItem={this.listItem.bind(this)}
					/>
				</div>
			</div>
		);
	}
}
