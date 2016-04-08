import React, { Component } from 'react';
import { connect } from 'react-redux';
import DatePicker from 'react-bootstrap-date-picker';
import { fromDateSet, toDateSet, updateFilter, fetchGlobalTimeInterval } from '../actionsForIcos';
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

	render() {
		const props = this.props;
		const fromDate = props.fromDate || props.fromDateMin;
		const toDate = props.toDate || props.toDateMax;

		return <div id="cp_data_search" className="container-fluid">
			<h1>ICOS Data Service search</h1>
			
			<div className="row">
				<div className="col-md-6"> <DatePicker label="Start" clearButtonElement="Reset" value={fromDate} onChange={props.fromDateChange} /> </div>
				<div className="col-md-6"> <DatePicker label="Stop" clearButtonElement="Reset" value={toDate} onChange={props.toDateChange} /> </div>
			</div>{
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
		}</div>;
	}
}

function stateToProps(state){
	return Object.assign({route: state.route}, state.icos);
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
		}
	};
}

export default connect(stateToProps, dispatchToProps)(Search);

