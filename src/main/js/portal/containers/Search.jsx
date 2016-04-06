import React, { Component } from 'react';
import { connect } from 'react-redux';
import DatePicker from 'react-bootstrap-date-picker';
import {fromDateSet, toDateSet, countrySet, fetchGlobalTimeInterval, fetchCountryList} from '../actionsForIcos';

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
		return <div id="cp_data_search" className="container-fluid">
			<h1>ICOS Data Service search</h1>
			
			<div className="row">
				<div className="col-md-6"> <DatePicker label="Start" clearButtonElement="Reset" value={this.props.fromDate} onChange={this.props.fromDateChange} /> </div>
				<div className="col-md-6"> <DatePicker label="Stop" clearButtonElement="Reset" value={this.props.toDate} onChange={this.props.toDateChange} /> </div>
			</div>
			
			<div className="row">
				<div className="col-md-12">
					<select className="form-control" value={this.props.country} onChange={this.props.countryChange}>{
						this.props.countries.map((country, i) => <option key={i} value={country}>{country}</option>)
					}</select>
				</div>
			</div>
			
		</div>
			
			
		;
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
		
		countryChange: function(country){
			dispatch(countrySet(country.value));
		},

		globalIntervalFetch(){
			dispatch(fetchGlobalTimeInterval);
		}
	};
}

export default connect(stateToProps, dispatchToProps)(Search);

