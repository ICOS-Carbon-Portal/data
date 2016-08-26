import {FETCHED_TABLEFORMAT, FETCHED_STATIONS, FETCHED_OBSERVATIONS, ERROR} from './actions';

export default function(state, action){

	switch(action.type){

		case FETCHED_TABLEFORMAT:
			return Object.assign({}, state, {
				status: FETCHED_META,
				wdcggFormat: action.wdcggFormat
			});

		case FETCHED_STATIONS:
			return Object.assign({}, state, {stations: action.stationPositions});

		case FETCHED_OBSERVATIONS:
			return state;

		case ERROR:
			return Object.assign({}, state, {error: action.error});

		default:
			return state;
	}

}


