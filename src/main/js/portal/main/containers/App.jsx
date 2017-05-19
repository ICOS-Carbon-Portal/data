import React, { Component } from 'react';
import { connect } from 'react-redux';
import {ERROR, META_QUERIED} from '../actions';
import {AnimatedToasters} from 'icos-cp-toaster';
// import ComboBox from '../components/ComboBox.jsx';
import Combobox from 'react-widgets/lib/Combobox';
import {queryMeta, reset} from '../actions';
import Multiselect from './InitSearch.jsx';

class App extends Component {
	constructor(props){
		super(props);

		this.state = {
			busy: false
		};

		this.comboboxes = {
			dobj: {
				placeholder: 'PID',
				data: [],
				value: undefined,
				minLength: 2
			},
			station: {
				placeholder: 'Stations',
				data: [],
				value: undefined,
				minLength: 0
			}
		};

		props.queryMeta('station', '', this.comboboxes.station.minLength);
	}

	componentWillReceiveProps(nextProps){
		// console.log({nextProps});
		if (nextProps.event === META_QUERIED){
			const comboboxes = this.comboboxes;
			const data = nextProps.metadata.data;
			const id = nextProps.metadata.id;

			comboboxes[id].data = data;

			if (data && data.indexOf(comboboxes[id].value) === 0) {
				console.log("Time to update all other controls");
			}
		}
	}

	listItem(id, props){
		const text = props.text.toLowerCase();
		const search = this.comboboxes[id].value ? this.comboboxes[id].value.toLowerCase() : undefined;
		const start = text.indexOf(search);

		if (start < 0) {
			return <span>{props.text}</span>;
		} else if (start === 0) {
			return (
				<span>
					<strong>{props.text.slice(start, start + search.length)}</strong>
					<span>{props.text.slice(start + search.length)}</span>
				</span>
			);
		} else {
			return (
				<span>
					<span>{props.text.slice(0, start - 1)}</span>
					<strong>{props.text.slice(start, start + search.length)}</strong>
					<span>{props.text.slice(start + search.length)}</span>
				</span>
			);
		}
	}

	handleChange(id, value){
		this.comboboxes[id].value = value;
		this.props.queryMeta(id, value, this.comboboxes[id].minLength);
	}

	handleResetBtnClick(id){
		this.comboboxes[id].value = undefined;
		this.props.queryMeta(id, '', this.comboboxes[id].minLength);
	}

	getComboBox(id, placeholder){
		const comboboxes = this.comboboxes;

		return (
			<div key={'cbrow' + id} className="row" style={{marginBottom: 10}}>
				<div className="col-md-1">
					<label>{placeholder}</label>
				</div>
				<div className="col-md-4">
					<Combobox
						placeholder={placeholder}
						value={comboboxes[id].value}
						data={comboboxes[id].data}
						onChange={this.handleChange.bind(this, id)}
						itemComponent={this.listItem.bind(this, id)}
						messages={{
							emptyList: comboboxes[id].data === undefined
								? `At least ${comboboxes[id].minLength} characters needed to perform a search`
								: comboboxes[id].value === undefined
									? `At least ${comboboxes[id].minLength} characters needed to perform a search`
									: "What you search for cannot be found"
						}}
					/>
				</div>
				<div className="col-md-1">
					<button
						className="btn btn-primary"
						onClick={this.handleResetBtnClick.bind(this, id)}
					>Reset</button>
				</div>
			</div>
		);
	}

	render() {
		const props = this.props;
		return(
			<div className="container" style={{marginTop: 10}}>
				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				{Object.keys(this.comboboxes).map((key, idx) =>
					this.getComboBox(key, this.comboboxes[key].placeholder))
				}

				<Multiselect specTable={props.specTable} />
			</div>
		);
	}
}

const stateToProps = state => {
	return Object.assign({}, state);
};

function dispatchToProps(dispatch){
	return {
		queryMeta: (id, search, minLength) => dispatch(queryMeta(id, search, minLength))
	};
}

export default connect(stateToProps, dispatchToProps)(App);
