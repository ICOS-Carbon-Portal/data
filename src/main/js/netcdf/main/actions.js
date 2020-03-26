import {getCountriesGeoJson, getRaster, getVariablesAndDates, getElevations, getServices, getTitle,
	getTimeserie} from './backend.js';
import {logError} from "../../common/main/backend";
import config from '../../common/main/config';

export const actionTypes = {
	ERROR: 'ERROR',
	COUNTRIES_FETCHED: 'COUNTRIES_FETCHED',
	SERVICES_FETCHED: 'SERVICES_FETCHED',
	VARIABLES_AND_DATES_FETCHED: 'VARIABLES_AND_DATES_FETCHED',
	ELEVATIONS_FETCHED: 'ELEVATIONS_FETCHED',
	RASTER_FETCHED: 'RASTER_FETCHED',
	SERVICE_SET: 'SERVICE_SET',
	SERVICE_SELECTED: 'SERVICE_SELECTED',
	VARIABLE_SELECTED: 'VARIABLE_SELECTED',
	DATE_SELECTED: 'DATE_SELECTED',
	ELEVATION_SELECTED: 'ELEVATION_SELECTED',
	GAMMA_SELECTED: 'GAMMA_SELECTED',
	DELAY_SELECTED: 'DELAY_SELECTED',
	PUSH_PLAY: 'PUSH_PLAY',
	SET_DELAY: 'SET_DELAY',
	INCREMENT_RASTER: 'INCREMENT_RASTER',
	TITLE_FETCHED: 'TITLE_FETCHED',
	FETCHING_TIMESERIE: 'FETCHING_TIMESERIE',
	TIMESERIE_FETCHED: 'TIMESERIE_FETCHED',
	TOGGLE_TS_SPINNER: 'TOGGLE_TS_SPINNER',
	TIMESERIE_RESET: 'TIMESERIE_RESET',
	COLORRAMP_SELECTED: 'COLORRAMP_SELECTED',
};


export function failWithError(error){
	console.log(error);

	logError(config.previewTypes.NETCDF, error.message);

	return {
		type: actionTypes.ERROR,
		error
	};
}

export const fetchServices = dispatch => {
	getServices().then(
		services => {
			dispatch({
				type: actionTypes.SERVICES_FETCHED,
				services
			});

			dispatch(selectService(0));
		},
		err => dispatch(failWithError(err))
	);
};

export const fetchTitle = pid => dispatch => {
	getTitle(pid).then(
		title => {
			dispatch({
				type: actionTypes.TITLE_FETCHED,
				title
			});
		},
		err => dispatch(failWithError(error))
	);
};

export const fetchCountriesTopo = dispatch => {
	getCountriesGeoJson().then(
		countriesTopo => {
			dispatch({
				type: actionTypes.COUNTRIES_FETCHED,
				countriesTopo
			});
		},
		err => dispatch(failWithError(err))
	);
};

export const setService = pid => dispatch => {
	dispatch({
		type: actionTypes.SERVICE_SET,
		services: [pid]
	});
	dispatch(fetchVariablesAndDates);
};

export const selectService = idx => dispatch => {
	dispatch({
		type: actionTypes.SERVICE_SELECTED,
		idx
	});
	dispatch(fetchVariablesAndDates);
};

const fetchVariablesAndDates = (dispatch, getState) => {
	const services = getState().controls.services;

	if(!services.hasSelected) return;

	getVariablesAndDates(services.selected).then(
		({variables, dates}) => {

			dispatch({
				type: actionTypes.VARIABLES_AND_DATES_FETCHED,
				variables,
				dates,
				service: services.selected
			});

			dispatch(fetchElevations);
		},
		err => dispatch(failWithError(err))
	);
};

const fetchElevations = (dispatch, getState) => {
	const controls = getState().controls;
	if(!controls.services.hasSelected || !controls.variables.hasSelected) return;

	getElevations(controls.services.selected, controls.variables.selected).then(
		elevations => {
			dispatch({
				type: actionTypes.ELEVATIONS_FETCHED,
				controlName: 'elevations',
				elevations,
				controls
			});
			dispatch(fetchRaster);
		},
		err => dispatch(failWithError(err))
	);
};

const fetchRaster = (dispatch, getState) => {
	const controls = getState().controls;
	const {services, variables, dates, elevations, gammas} = controls;

	if(!services.hasSelected || !variables.hasSelected || !dates.hasSelected || !elevations.isLoaded) return;

	const elevation = elevations.hasSelected ? elevations.selected : null;

	getRaster(services.selected, variables.selected, dates.selected, elevation, gammas.selected).then(
		raster => dispatch({
			type: actionTypes.RASTER_FETCHED,
			raster,
			controls
		}),
		err => dispatch(failWithError(err))
	);
};

export const fetchTimeSerie = params => dispatch => {
	dispatch({type: actionTypes.FETCHING_TIMESERIE});

	const showSpinnerTimer = setTimeout(() => dispatch({
		type: actionTypes.TOGGLE_TS_SPINNER,
		showTSSpinner: true
	}), 300);

	getTimeserie(params).then(yValues => {
		clearTimeout(showSpinnerTimer);

		if (yValues.length > 0) {
			dispatch({
				type: actionTypes.TOGGLE_TS_SPINNER,
				showTSSpinner: false
			});

			dispatch({
				type: actionTypes.TIMESERIE_FETCHED,
				yValues,
				timeserieParams: params
			});
		}
	});
};

export const resetTimeserieData = dispatch => {
	dispatch({type: actionTypes.TIMESERIE_RESET});
};

export const pushPlayButton = (dispatch, getState) => {
	if (!getState().rasterDataFetcher) return;

	dispatch({type: actionTypes.PUSH_PLAY});
	dispatch(incrementIfNeeded);
};

export const incrementRasterData = increment => dispatch => {
	dispatch({
		type: actionTypes.INCREMENT_RASTER,
		increment
	});

	dispatch(fetchRasterData);
};

const fetchRasterData = (dispatch, getState) => {
	const state = getState();
	if(!state.desiredId) return;

	if (state.raster && state.raster.id === state.desiredId) {
		dispatch(incrementIfNeeded);
	} else {
		state.rasterDataFetcher.fetch(state.controls.selectedIdxs).then(
			raster => {
				dispatch({
					type: actionTypes.RASTER_FETCHED,
					desiredId: state.desiredId,
					controls: state.controls,
					raster
				});
				dispatch(incrementIfNeeded);
			},
			err => dispatch(failWithError(err)));
	}
};

export const incrementIfNeeded = (dispatch, getState) => {
	setTimeout(() => {
		if(getState().playingMovie) {
			dispatch(incrementRasterData(1));
		}
	}, 5); //a tiny delay in hope to improve interface's responsiveness
};

export const selectVariable = idx => (dispatch, getState) => {
	dispatch({
		type: actionTypes.VARIABLE_SELECTED,
		idx
	});
	dispatch(fetchElevations);

	const {timeserieParams, controls} = getState();

	if (timeserieParams) {
		const params = Object.assign({}, timeserieParams, {variable: controls.variables.selected});
		dispatch(fetchTimeSerie(params));
	}
};

export const selectDate = idx => dispatch => {
	dispatch({
		type: actionTypes.DATE_SELECTED,
		idx
	});
	dispatch(fetchRaster);
};

export const selectElevation = idx => dispatch => {
	dispatch({
		type: actionTypes.ELEVATION_SELECTED,
		idx
	});
	dispatch(fetchRaster);
};

export const selectGamma = idx => dispatch => {
	dispatch({
		type: actionTypes.GAMMA_SELECTED,
		idx
	});
};

export const selectDelay = idx => dispatch => {
	dispatch({
		type: actionTypes.DELAY_SELECTED,
		idx
	});
};

export const selectColorRamp = idx => dispatch => {
	dispatch({
		type: actionTypes.COLORRAMP_SELECTED,
		idx
	});
};
