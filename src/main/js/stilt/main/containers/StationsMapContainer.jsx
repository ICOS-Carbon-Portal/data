import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import StationsMap from '../components/LMap.jsx';
import {setSelectedStation} from '../actions.js';
import copyprops from '../../../common/main/general/copyprops';

class StationsMapContainer extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;
		const {selectYear, selectedStation, selectedYear} = this.props;
		const availableStations = props.stations.length > 0
			? props.stations.map(station => station.name)
			: [];

		const selectedStationName = selectedStation ? selectedStation.name : null;
		const availableYears = selectedStation ? selectedStation.years.map(year => year.year) : [];
		const yearValue = selectedYear ? selectedYear.year : null;
		// console.log({props, availableYears, selectYear, selectedStation, selectedYear, yearValue});

		return <div style={{height: 250}}>
			<StationsMap
				stations={props.stations}
				selectedStation={props.selectedStation}
				action={props.stationSelect}
			/>
		</div>;
	}
}

function stateToProps(state){
	return copyprops(state, ['stations', 'selectedStation']);
}

function dispatchToProps(dispatch){
	return {
		stationSelect: station => dispatch(setSelectedStation(station)),
	};
}

export default connect(stateToProps, dispatchToProps)(StationsMapContainer);

