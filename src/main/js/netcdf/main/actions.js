import {getCountriesGeoJson, getServices, getVariables, getDates, getElevations, getRaster} from './backend.js';

export const ERROR = 'ERROR';
export const COUNTRIES_FETCHED = 'COUNTRIES_FETCHED';
export const SERVICES_FETCHED = 'SERVICES_FETCHED';
export const VARIABLES_FETCHED = 'VARIABLES_FETCHED';
export const DATES_FETCHED = 'DATES_FETCHED';
export const ELEVATIONS_FETCHED = 'ELEVATIONS_FETCHED';
export const CTRL_HELPER_UPDATED = 'CTRL_HELPER_UPDATED';
export const RASTER_FETCHED = 'RASTER_FETCHED';
export const SERVICE_SELECTED = 'SERVICE_SELECTED';
export const VARIABLE_SELECTED = 'VARIABLE_SELECTED';
export const DATE_SELECTED = 'DATE_SELECTED';
export const ELEVATION_SELECTED = 'ELEVATION_SELECTED';
export const GAMMA_SELECTED = 'GAMMA_SELECTED';

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
}

export const fetchServices = dispatch => {
	getServices().then(
		services => {
			dispatch({
				type: SERVICES_FETCHED,
				controlName: 'services',
				services
			});
			dispatch(fetchVariables);
			dispatch(fetchDates);
		},
		err => dispatch(failWithError(err))
	);
}

export const fetchVariables = (dispatch, getState) => {
	const services = getState().controls.services;

	if(!services.hasSelected) return;

	getVariables(services.selected).then(
		variables => {
			dispatch({
				type: VARIABLES_FETCHED,
				controlName: 'variables',
				variables,
				service: services.selected
			});
			dispatch(fetchElevations);
		},
		err => dispatch(failWithError(err))
	);
}

export const fetchDates = (dispatch, getState) => {
	const services = getState().controls.services;

	if(!services.hasSelected) return;

	getDates(services.selected).then(
		dates => {
			dispatch({
				type: DATES_FETCHED,
				controlName: 'dates',
				dates,
				service: services.selected
			});
		},
		err => dispatch(failWithError(err))
	);
}

export const fetchElevations = (dispatch, getState) => {
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
}

export const fetchRaster = (dispatch, getState) => {
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
}

export const selectService = idx => dispatch => {
	dispatch({
		type: SERVICE_SELECTED,
		idx
	});
	dispatch(fetchVariables);
	dispatch(fetchDates);
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