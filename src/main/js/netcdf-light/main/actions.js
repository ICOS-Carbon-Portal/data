import {getCountriesGeoJson, getRaster} from './backend.js';

export const ERROR = 'ERROR';
export const COUNTRIES_FETCHED = 'COUNTRIES_FETCHED';
export const RASTER_FETCHED = 'RASTER_FETCHED';
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
};

export const fetchRaster = (dispatch, getState) => {
	const params = getState().params;

	getRaster(params.search).then(
		raster => dispatch({
			type: RASTER_FETCHED,
			raster
		}),
		err => dispatch(failWithError(err))
	);
};

export const selectGamma = idx => dispatch => {
	dispatch({
		type: GAMMA_SELECTED,
		idx
	});
};
