import {getCountriesGeoJson, getServices, getVariablesAndDates, getElevations, getRaster} from './backend.js';

export const ERROR = 'ERROR';
export const COUNTRIES_FETCHED = 'COUNTRIES_FETCHED';
export const SERVICES_FETCHED = 'SERVICES_FETCHED';
export const VARIABLES_AND_DATES_FETCHED = 'VARIABLES_AND_DATES_FETCHED';
export const ELEVATIONS_FETCHED = 'ELEVATIONS_FETCHED';
export const RASTER_FETCHED = 'RASTER_FETCHED';
export const SERVICE_SELECTED = 'SERVICE_SELECTED';
export const VARIABLE_SELECTED = 'VARIABLE_SELECTED';
export const DATE_SELECTED = 'DATE_SELECTED';
export const ELEVATION_SELECTED = 'ELEVATION_SELECTED';
export const GAMMA_SELECTED = 'GAMMA_SELECTED';
export const DELAY_SELECTED = 'DELAY_SELECTED';
export const RASTER_VALUE_RECEIVED = 'RASTER_VALUE_RECEIVED';
export const PUSH_PLAY = 'PUSH_PLAY';
export const SET_DELAY = 'SET_DELAY';
export const INCREMENT_RASTER = 'INCREMENT_RASTER';

function failWithError(error){
	console.log(error);
	return {
		type: ERROR,
		error
	};
}

export const fetchCountriesTopo = dispatch => {
	getCountriesGeoJson().then(
		countriesTopo => {
			dispatch({
				type: COUNTRIES_FETCHED,
				countriesTopo
			});
		},
		err => dispatch(failWithError(err))
	);
};

export const fetchServices = dispatch => {
	getServices().then(
		services => {
			dispatch({
				type: SERVICES_FETCHED,
				controlName: 'services',
				services
			});
			dispatch(fetchVariablesAndDates);
		},
		err => dispatch(failWithError(err))
	);
};

export const setService = service => dispatch => {
	dispatch({
		type: SERVICES_FETCHED,
		controlName: 'services',
		services: [service]
	});
};

const fetchVariablesAndDates = (dispatch, getState) => {
	const services = getState().controls.services;

	if(!services.hasSelected) return;

	getVariablesAndDates(services.selected).then(
		({variables, dates}) => {

			dispatch({
				type: VARIABLES_AND_DATES_FETCHED,
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
				type: ELEVATIONS_FETCHED,
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
			type: RASTER_FETCHED,
			raster,
			controls
		}),
		err => dispatch(failWithError(err))
	);
};

export const pushPlayButton = (dispatch, getState) => {
	if (!getState().rasterDataFetcher) return;

	dispatch({type: PUSH_PLAY});
	dispatch(incrementIfNeeded);
};

export const incrementRasterData = increment => dispatch => {
	dispatch({
		type: INCREMENT_RASTER,
		increment
	});

	dispatch(fetchRasterData);
};

const fetchRasterData = (dispatch, getState) => {
	const state = getState();
	if(!state.desiredId) return;

	if (state.raster && state.raster.id == state.desiredId) {
		dispatch(incrementIfNeeded);
	} else {
		state.rasterDataFetcher.fetch(state.controls.selectedIdxs).then(
			raster => {
				dispatch({
					type: RASTER_FETCHED,
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
	var ts = Date.now();

	setTimeout(() => {
		if(getState().playingMovie) {
			dispatch(incrementRasterData(1));
		}
	}, 5); //a tiny delay in hope to improve interface's responsiveness
};


export const selectService = idx => dispatch => {
	dispatch({
		type: SERVICE_SELECTED,
		idx
	});
	dispatch(fetchVariablesAndDates);
};

export const selectVariable = idx => dispatch => {
	dispatch({
		type: VARIABLE_SELECTED,
		idx
	});
	dispatch(fetchElevations);
};

export const selectDate = idx => dispatch => {
	dispatch({
		type: DATE_SELECTED,
		idx
	});
	dispatch(fetchRaster);
};

export const selectElevation = idx => dispatch => {
	dispatch({
		type: ELEVATION_SELECTED,
		idx
	});
	dispatch(fetchRaster);
};

export const selectGamma = idx => dispatch => {
	dispatch({
		type: GAMMA_SELECTED,
		idx
	});
};

export const selectDelay = idx => dispatch => {
	dispatch({
		type: DELAY_SELECTED,
		idx
	});
};

export const setRasterVal = val => dispatch => {
	dispatch({
		type: RASTER_VALUE_RECEIVED,
		val
	});
};