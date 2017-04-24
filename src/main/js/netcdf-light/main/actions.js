import {getCountriesGeoJson, getRaster} from './backend.js';

export const ERROR = 'ERROR';
export const COUNTRIES_FETCHED = 'COUNTRIES_FETCHED';
export const RASTER_FETCHED = 'RASTER_FETCHED';

export function failWithError(error){
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

	getRaster(getRasterId(params, params.get('gamma')), params.search).then(
		raster => dispatch({
			type: RASTER_FETCHED,
			raster
		}),
		err => dispatch(failWithError(err))
	);
};

export const getRasterId = (params, gamma) =>{
	return params.required
		.filter(p => p !== 'gamma')
		.map(p => p + '=' + params.get(p))
		.join('&') + '&gamma=' + gamma;
};