import {FETCHED_TABLEFORMAT, FETCHED_STATIONS, FETCHED_OBSERVATIONS, SET_SELECTED_STATION, SET_SELECTED_YEAR, ERROR} from './actions';

export default function(state, action){

	switch(action.type){

		case FETCHED_TABLEFORMAT:
			return Object.assign({}, state, {
				wdcggFormat: action.wdcggFormat
			});

		case FETCHED_STATIONS:
			return Object.assign({}, state, {stations: action.stationInfo});

		case SET_SELECTED_STATION:
			const selectedStation = action.selectedStation;

			return Object.assign({}, state, {
				selectedStation,
				availableYears: selectedStation.years.map(year => year.year),
				selectedYear: selectedStation.years.length == 1
					? selectedStation.years[0].year
					: null
			});

		case SET_SELECTED_YEAR:
			return Object.assign({}, state, {
				selectedYear: action.selectedYear
			});

		case FETCHED_OBSERVATIONS:
			//TODO Add a "result-is-still-relevant" control here
			return Object.assign({}, state, {obsBinTable: action.obsBinTable});

		case ERROR:
			return Object.assign({}, state, {error: action.error});

		default:
			return state;
	}

}


