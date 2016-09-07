import {getInitialData, getTimeSeries, getRaster} from './backend';
import config from './config';

export const FETCHED_INITDATA = 'FETCHED_INITDATA';
export const FETCHED_TIMESERIES = 'FETCHED_TIMESERIES';
export const FETCHED_RASTER = 'FETCHED_RASTER';
export const SET_SELECTED_STATION = 'SET_SELECTED_STATION';
export const SET_SELECTED_YEAR = 'SET_SELECTED_YEAR';
export const SET_DATE_RANGE = 'SET_DATE_RANGE';
export const SET_VISIBILITY = 'SET_VISIBILITY';
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

function gotTimeSeriesData(timeSeries, stationId, year){
	return Object.assign({}, timeSeries, {
		type: FETCHED_TIMESERIES,
		stationId,
		year
	});
}

export const fetchTimeSeries = (dispatch, getState) => {
	const state = getState();
	const year = state.selectedYear;
	if(!year) return;
	const stationId = state.selectedStation.id;

	getTimeSeries(stationId, year.year, year.dataObject, state.wdcggFormat).then(
		timeSeries => {
			dispatch(gotTimeSeriesData(timeSeries, stationId, year.year));
		},
		err => dispatch(failWithError(err))
	);
}

export const setSelectedStation = station => dispatch => {
	dispatch({
		type: SET_SELECTED_STATION,
		station
	});
	dispatch(fetchTimeSeries); //year might have been selected automatically
}

export const setSelectedYear = year => dispatch => {
	dispatch({
		type: SET_SELECTED_YEAR,
		year
	});
	dispatch(fetchTimeSeries);
}

export const setDateRange = dateRange => (dispatch, getState) => {
	const currRange = getState().dateRange;

	if(currRange && currRange[0] == dateRange[0] && currRange[1] == dateRange[1]) return;

	dispatch({
		type: SET_DATE_RANGE,
		dateRange
	});

	dispatch(fetchFootprint);
}

const fetchFootprint = (dispatch, getState) => {
	const state = getState();
	const footprint = state.desiredFootprint;
	if(!footprint) return;

	const stationId = state.selectedStation.id;

	if(!state.footprint || footprint.date != state.footprint.date) getRaster(stationId, footprint.filename).then(
		raster => dispatch({
			type: FETCHED_RASTER,
			footprint,
			raster
		}),
		err => dispatch(failWithError(err))
	);

}

