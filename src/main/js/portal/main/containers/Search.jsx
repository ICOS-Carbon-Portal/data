import React, { Component } from 'react';
import { connect } from 'react-redux';
import { routeUpdated, fromDateSet, toDateSet, updateFilter, fetchGlobalTimeInterval } from '../actions';
import config from '../config';
import PropertyValueSelect from '../components/PropertyValueSelect.jsx';
import DatePicker from '../components/DatePickerEncloser.jsx';
import BinTable from '../models/BinTable';
import {binTables2Dygraph} from '../models/chartDataMaker';

class Search extends Component {
	constructor(props){
		super(props);

		const length = 4;
		const bytes = new ArrayBuffer(length * 2 * 8);
		const doubles = new Float64Array(bytes);

		['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'].forEach((date, i) => {
			const millis = Date.parse(date);
			return doubles[i] = millis;
		});
		[1,2,3,4].forEach((value, i) => doubles[length + i] = value);
		const schema = {
			columns: ['DOUBLE', 'DOUBLE'],
			size: length
		};

		const binTable = new BinTable(bytes, schema);
		const data = binTables2Dygraph([binTable]);

		console.log({binTable, data, date: new Date(Date.parse('2016-01-01'))});

		// const data = [
		// 	[Date.parse('2016-01-01'), Date.parse('2016-01-02'), Date.parse('2016-01-03'), Date.parse('2016-01-04')],
		// 	[1,2,3,4]
		// ];
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

				<DatePicker
					date1={ fromDate }
					date2={ toDate }
					onChange1={ this.props.fromDateChange }
					onChange2={ this.props.toDateChange }
					minDate={ this.props.fromDateMin }
					maxDate={ this.props.toDateMax } />
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

export default connect(state => state, dispatchToProps)(Search);

