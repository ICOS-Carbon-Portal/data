import React, { Component } from 'react';
import ReactDOM from 'react-dom'
import { connect } from 'react-redux';
import DatePicker from 'react-bootstrap-date-picker';
import { fromDateSet, toDateSet, updateFilter, fetchGlobalTimeInterval } from '../actionsForIcos';
import {routeUpdated} from '../actions'
import config from '../config';
import PropertyValueSelect from '../components/PropertyValueSelect.jsx';

class Search extends Component {
	constructor(props){
		super(props);
	}

	componentDidMount() {
		if(!this.props.fromDate) {
			this.props.globalIntervalFetch();
		}
	}

	onViewBtnClick(){
		this.props.showView();
	}

	render() {
		const props = this.props;
		const fromDate = props.fromDate || props.fromDateMin;
		const toDate = props.toDate || props.toDateMax;
		const returnedObjects = props.filteredDataObjects ? Object.keys(props.filteredDataObjects).length : null;

		return (
			<div id="cp_data_search" className="container-fluid">
				<h1>ICOS Data Service search</h1>

				<div className="row">
					<div className="col-md-6"> <DatePicker label="Start" clearButtonElement="Reset" value={fromDate} onChange={props.fromDateChange} /> </div>
					<div className="col-md-6"> <DatePicker label="Stop" clearButtonElement="Reset" value={toDate} onChange={props.toDateChange} /> </div>
				</div>
				{
					config.wdcggProps.map(
						({label, uri}, i) =>
							<PropertyValueSelect
								label={label}
								prop={uri}
								filter={props.filters[uri]}
								valueCounts={props.propValueCounts[uri]}
								filterUpdate={props.filterUpdate}
								key={i}
							/>
					)
				}
				{returnedObjects
					? (
						<div>
							<div className="row">
								<div className="col-md-3">
									<label>Number of returned data objects:</label> <span>{returnedObjects}</span>
								</div>
							</div>
							<div className="row">
								<div className="col-md-3">
									<button onClick={() => this.onViewBtnClick()} className="btn btn-primary">View returned data objects</button>
								</div>
							</div>
						</div>
					)
					: null
				}
			</div>
		);
	}
}

function stateToProps(state){
	return Object.assign({route: state.route},
		state.icos,
		state.wdcgg
	);
}

function dispatchToProps(dispatch){
	return {
		fromDateChange: function(date){
			dispatch(fromDateSet(date));
		},
		
		toDateChange: function(date){
			dispatch(toDateSet(date));
		},

		filterUpdate: function(propUri, filter){
			dispatch(updateFilter(propUri, filter));
		},

		globalIntervalFetch(){
			dispatch(fetchGlobalTimeInterval);
		},

		showView(){
			dispatch(routeUpdated('view'));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(Search);

