import {FETCHED_TABLEFORMAT, FETCHED_STATIONS, FETCHED_TIMESERIES, SET_SELECTED_STATION, SET_SELECTED_YEAR, ERROR} from './actions';

export default function(state, action){

	switch(action.type){

		case FETCHED_TABLEFORMAT:
			return Object.assign({}, state, {
				wdcggFormat: action.wdcggFormat
			});

		case FETCHED_STATIONS:
			return Object.assign({}, state, {stations: action.stationInfo});

		case SET_SELECTED_STATION:
			const station = action.station;

			return Object.assign({}, state, {
				selectedStation: station,
				selectedYear: station.years.length == 1
					? station.years[0]
					: null
			});

		case SET_SELECTED_YEAR:
			return Object.assign({}, state, {
				selectedYear: state.selectedStation.years.find(year => year.year == action.year)
			});

		case FETCHED_TIMESERIES:
			return state.selectedYear && state.selectedYear.year == action.year
				? Object.assign({}, state, {obsBinTable: action.obsBinTable, modelResults: action.modelResults})
				: state;

		case ERROR:
			return Object.assign({}, state, {error: action.error});

		default:
			return state;
	}

}


