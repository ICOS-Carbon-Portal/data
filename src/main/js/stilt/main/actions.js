import {tableFormatForSpecies} from '../../common/main/backend/tableFormat';
import {getStationInfo, getTimeSeries, getCountriesTopoJson, getRaster} from './backend';
import config from './config';

export const FETCHED_TABLEFORMAT = 'FETCHED_TABLEFORMAT';
export const FETCHED_STATIONS = 'FETCHED_STATIONS';
export const FETCHED_TIMESERIES = 'FETCHED_TIMESERIES';
export const FETCHED_COUNTRIES = 'FETCHED_COUNTRIES';
export const FETCHED_RASTER = 'FETCHED_RASTER';
export const SET_SELECTED_STATION = 'SET_SELECTED_STATION';
export const SET_SELECTED_YEAR = 'SET_SELECTED_YEAR';
export const ERROR = 'ERROR';


function failWithError(error){
	console.log(error);
	return {
		type: ERROR,
		error
	};
}

function gotTimeSeriesData(timeSeries, year){
	return Object.assign({}, timeSeries, {
		type: FETCHED_TIMESERIES,
		year
	});
}

export const fetchTableFormat = dispatch => {
	tableFormatForSpecies(config.wdcggSpec).then(
		wdcggFormat => dispatch({
			type: FETCHED_TABLEFORMAT,
			wdcggFormat
		}),
		err => dispatch(failWithError(err))
	);
}

export const fetchStationInfo = dispatch => {
	getStationInfo().then(
		stationInfo => dispatch({
			type: FETCHED_STATIONS,
			stationInfo
		}),
		err => dispatch(failWithError(err))
	);

	getCountriesTopoJson().then(
		countriesTopo => {
			dispatch({
				type: FETCHED_COUNTRIES,
				countriesTopo
			});
		},
		err => dispatch(failWithError(err))
	);

	getRaster().then(
		raster => dispatch({
			type: FETCHED_RASTER,
			raster
		}),
		err => dispatch(failWithError(err))
	);
}

export const fetchTimeSeries = (dispatch, getState) => {
	const state = getState();
	const year = state.selectedYear;
	if(!year) return;

	getTimeSeries(state.selectedStation.id, year.year, year.dataObject, state.wdcggFormat).then(
		timeSeries => dispatch(gotTimeSeriesData(timeSeries, year.year)),
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

