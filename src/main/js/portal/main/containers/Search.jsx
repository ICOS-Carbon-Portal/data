import React, { Component } from 'react';
import { connect } from 'react-redux';
import { routeUpdated, updateFilter, fetchGlobalTimeInterval } from '../actions';
import config from '../config';
import PropertyValueSelect from '../components/PropertyValueSelect.jsx';
import DatePicker from '../components/DatePickerEncloser.jsx';
import SpatialSearch from '../components/SpatialSearch.jsx';

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
		console.log({props});

		return (
			<div id="cp_data_search" className="container-fluid">
				<h1>ICOS Data Service search</h1>

				<div className="row">
					<DatePicker
						date1={ fromDate }
						date2={ toDate }
						filterUpdate1={ props.filterUpdate }
						filterUpdate2={ props.filterUpdate }
						minDate={ this.props.fromDateMin }
						maxDate={ this.props.toDateMax }
					/>

					<SpatialSearch />
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

function dispatchToProps(dispatch){
	return {
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

