import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import StationsMap from '../components/LMap.jsx';
import Select from '../components/Select.jsx';
import {setSelectedYear} from '../actions.js';
import {setSelectedStation} from '../actions.js';

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

		return (
			<div>
				<div style={{height: 200}}>
					<StationsMap
						stations={props.stations}
						selectedStation={props.selectedStation}
						action={props.stationSelect}
					/>
				</div>
				<div>
					<Select
						selectValue={props.stationSelect}
						infoTxt={'Select station or click in map'}
						availableValues={availableStations}
						dataList={props.stations}
						value={selectedStationName}
					/>
					<Select
						selectValue={selectYear}
						infoTxt={'Select year'}
						availableValues={availableYears}
						dataList={availableYears}
						value={yearValue}
					/>
				</div>
			</div>
		);
	}
}

function stateToProps(state){
	return state;
}

function dispatchToProps(dispatch){
	return {
		stationSelect(station){
			dispatch(setSelectedStation(station));
		},

		selectYear(year){
			dispatch(setSelectedYear(year));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(StationsMapContainer);

