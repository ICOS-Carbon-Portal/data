import React, { Component } from 'react';
import { connect } from 'react-redux';
import { routeUpdated, updateFilter, fetchGlobalTimeInterval } from '../actions';
import config from '../config';
import PropertyValueSelect from '../components/PropertyValueSelect.jsx';
import DatePickerEncloser from '../components/DatePickerEncloser.jsx';
import SpatialSearch from '../components/SpatialSearch.jsx';
import {AnimatedToasters} from 'icos-cp-toaster';

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
		const fromDate = props.filters[config.fromDateProp].value || props.fromDateMin;
		const toDate = props.filters[config.toDateProp].value || props.toDateMax;
		const returnedObjects = props.filteredDataObjects ? Object.keys(props.filteredDataObjects).length : null;

		return (
			<div id="cp_data_search" className="container-fluid">
				<AnimatedToasters toasterData={props.toasterData} autoCloseDelay={5000} />

				<div className="page-header">
					<h1>ICOS Data Service search</h1>
				</div>

				<div className="row">
					<DatePickerEncloser
						date1={ fromDate }
						date2={ toDate }
						filterUpdate1={ props.filterUpdate }
						filterUpdate2={ props.filterUpdate }
						minDate={ props.fromDateMin }
						maxDate={ props.toDateMax }
					/>

					<SpatialSearch
						filters={props.filters}
						stations={props.stations}
						filterUpdate={props.filterUpdate}
						spatialMode={props.spatialMode}
					/>
				</div>
				{
					config.filteringWidgets.map(
						({label, prop}, i) =>
							<PropertyValueSelect
								label={label}
								prop={prop}
								filter={props.filters[prop]}
								valueCounts={props.propValueCounts[prop]}
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

