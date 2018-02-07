import React, { Component } from 'react';
import {Combobox} from 'react-widgets';
import {debounce} from 'icos-cp-utils';


const minLength = 3;

export default class FilterByPid extends Component{
	constructor(props){
		super(props);

		this.state = {
			busy: false,
			value: props.pids.length === 1 ? props.pids[0] : ''
		};

		this.makeQueryDebounced = debounce(this.makeQuery.bind(this));
	}

	handleSearch(pidStr){
		this.setState({value: pidStr});

		if (pidStr.length >= minLength) {
			this.makeQueryDebounced(pidStr);
		} else if (this.props.pids.length > 0 && pidStr.length === 0){
			this.handleClear();
		}
	}

	makeQuery(pidStr){
		this.setState({busy: true});
		this.props.queryMeta('dobj', pidStr);
	}

	handleClear(){
		this.setState({value: ''});
		this.props.queryMeta('dobj');
	}

	componentWillReceiveProps(){
		if (this.state.busy) this.setState({busy: false});
	}

	listItem(item){
		const text = item.text.toLowerCase();
		const searchStr = this.state.value.toLowerCase();
		const start = text.indexOf(searchStr);

		if (start < 0) {
			return <span>{item.text}</span>;
		} else if (start === 0) {
			return (
				<span>
					<strong>{item.text.slice(start, start + searchStr.length)}</strong>
					<span>{item.text.slice(start + searchStr.length)}</span>
				</span>
			);
		} else {
			return (
				<span>
					<span>{item.text.slice(0, start - 1)}</span>
					<strong>{item.text.slice(start, start + searchStr.length)}</strong>
					<span>{item.text.slice(start + searchStr.length)}</span>
				</span>
			);
		}
	}

	render(){
		const {busy, value} = this.state;
		const props = this.props;

		return (
			<div className="row" style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>PID</label>
					<div className="input-group">
						<Combobox
							busy={busy}
							placeholder="Search by PID"
							data={props.pids}
							value={value}
							filter="contains"
							onChange={this.handleSearch.bind(this)}
							itemComponent={this.listItem.bind(this)}
						/>
						<span className="input-group-btn">
							<button
								className="btn btn-primary"
								style={{marginLeft:10, borderRadius:4}}
								type="button"
								onClick={this.handleClear.bind(this)}
							>Clear</button>
						</span>
					</div>
				</div>
			</div>
		);
	}
}
