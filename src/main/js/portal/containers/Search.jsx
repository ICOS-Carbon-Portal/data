import React, { Component } from 'react';
import { connect } from 'react-redux';
import { fromDateSet, toDateSet, updateFilter, fetchGlobalTimeInterval } from '../actionsForIcos';
import config from '../config';
import PropertyValueSelect from '../components/PropertyValueSelect.jsx';
import DatePicker from '../components/DatePickerEncloser.jsx';

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
			
			<DatePicker 
				date1={ this.props.fromDate } 
				date2={ this.props.toDate } 
				onChange1={ this.props.fromDateChange } 
				onChange2={ this.props.toDateChange } 
				minDate={ this.props.fromDateMin } 
				maxDate={ this.props.toDateMax } />{
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

function dispatchToProps(dispatch){
	return {
		fromDateChange: function(date){console.log(date);
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

export default connect(state => state.icos, dispatchToProps)(Search);

