import {getInitialData, getStationData} from './backend';
import {throttle} from 'icos-cp-utils';

export const FETCHED_INITDATA = 'FETCHED_INITDATA';
export const FETCHED_STATIONDATA = 'FETCHED_STATIONDATA';
export const FETCHED_RASTER = 'FETCHED_RASTER';
export const SET_SELECTED_STATION = 'SET_SELECTED_STATION';
export const SET_SELECTED_YEAR = 'SET_SELECTED_YEAR';
export const SET_DATE_RANGE = 'SET_DATE_RANGE';
export const SET_VISIBILITY = 'SET_VISIBILITY';
export const INCREMENT_FOOTPRINT = 'INCREMENT_FOOTPRINT';
export const PUSH_PLAY = 'PUSH_PLAY';
export const SET_DELAY = 'SET_DELAY';
export const ERROR = 'ERROR';


export const fetchInitData = dispatch => {
	getInitialData().then(
		initData => dispatch(Object.assign({type: FETCHED_INITDATA}, initData)),
		err => dispatch(failWithError(err))
	);
}

export function visibilityUpdate(name, visibility){
	return {
		type: SET_VISIBILITY,
		update: {[name]: visibility}
	};
}

function failWithError(error){
	console.log(error);
	return {
		type: ERROR,
		error
	};
}

function gotStationData(stationData, stationId, year){
	return Object.assign({}, stationData, {
		type: FETCHED_STATIONDATA,
		stationId,
		year
	});
}

export const fetchStationData = (dispatch, getState) => {
	const state = getState();
	const year = state.selectedYear;
	if(!year) return;
	const stationId = state.selectedStation.id;

	getStationData(stationId, year.year, year.dataObject, state.wdcggFormat).then(
		stationData => {
			dispatch(gotStationData(stationData, stationId, year.year));
		},
		err => dispatch(failWithError(err))
	);
}

export const setSelectedStation = selectedStation => dispatch => {
	dispatch({
		type: SET_SELECTED_STATION,
		selectedStation
	});
	dispatch(fetchStationData); //year might have been selected automatically
}

export const setSelectedYear = selectedYear => dispatch => {
	dispatch({
		type: SET_SELECTED_YEAR,
		selectedYear
	});
	dispatch(fetchStationData);
}

export const setDateRange = dateRange => (dispatch, getState) => {
	const currRange = getState().dateRange;

	if(currRange && currRange[0] == dateRange[0] && currRange[1] == dateRange[1]) return;

	dispatch({
		type: SET_DATE_RANGE,
		dateRange
	});

	fetchFootprintThrottled(dispatch);
}

const fetchFootprint = (dispatch, getState) => {
	const state = getState();
	const desired = state.desiredFootprint;
	if(!desired) return;

	if(state.footprint && desired.date == state.footprint.date) {
//		console.log('footprint already there, will increment if needed');
		dispatch(incrementIfNeeded);
	} else state.footprintsFetcher.fetch(desired).then(
		raster => {
			//console.log('fetched ', desired);
			dispatch({
				type: FETCHED_RASTER,
				footprint: desired,
				raster
			});
		},
		err => dispatch(failWithError(err))
	);
}

const fetchFootprintThrottled = throttle(dispatch => dispatch(fetchFootprint), 300);

export const incrementFootprint = increment => dispatch => {
	dispatch({
		type: INCREMENT_FOOTPRINT,
		increment
	});

	dispatch(fetchFootprint);
}

export const incrementIfNeeded = (dispatch, getState) => {
//	var ts = Date.now();
//	console.log('will increment in 5 ms after', ts);

	setTimeout(() => {
		if(getState().playingMovie) {
//			console.log('incrementing after ', ts);
			dispatch(incrementFootprint(1));
		} else {
//			console.log('not incrementing after ', ts);
		}
	}, 5); //a tiny delay in hope to improve interface's responsiveness
}

export const pushPlayButton = (dispatch, getState) => {
	dispatch({type: PUSH_PLAY});
	dispatch(incrementIfNeeded);
}

export const setDelay = delay => {
	return {
		type: SET_DELAY,
		delay
	};
}

