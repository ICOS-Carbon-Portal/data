import {getGlobalTimeInterval, getFilteredPropValueCounts} from './backend';

export const FROM_DATE_SET = 'FROM_DATE_SET';
export const TO_DATE_SET = 'TO_DATE_SET';
//export const COUNTRY_SET = 'COUNTRY_SET';
export const ERROR = 'ERROR';
export const GOT_GLOBAL_TIME_INTERVAL = 'GOT_GLOBAL_TIME_INTERVAL';
//export const GOT_COUNTRIES = 'GOT_COUNTRIES';
export const FILTER_UPDATED = 'FILTER_UPDATED';
export const GOT_PROP_VAL_COUNTS = 'GOT_PROP_VAL_COUNTS';


export const fromDateSet = (date) => dispatch => {
	dispatch({
		type: FROM_DATE_SET,
		date
	});
	dispatch(fetchPropValueCounts);
}

export const toDateSet = (date) => dispatch => {
	dispatch({
		type: TO_DATE_SET,
		date
	});
	dispatch(fetchPropValueCounts);
}

/*
export function countrySet(country){
	return {
		type: COUNTRY_SET,
		country
	};
}
*/

export function fetchGlobalTimeInterval(dispatch, getState){
	const objSpec = getState().icos.objectSpecification;

	getGlobalTimeInterval(objSpec).then(
		interval => {
			dispatch(gotGlobalTimeInterval(objSpec, interval));
			dispatch(fetchPropValueCounts);
		},
		err => dispatch(gotError(err))
	);
}

function gotError(error){
	console.log({error});
	return {
		type: ERROR,
		error
	};
}

function gotGlobalTimeInterval(objectSpecification, interval){
	return Object.assign(
		{
			type: GOT_GLOBAL_TIME_INTERVAL,
			objectSpecification
		},
		interval
	);
}

/*function fetchCountryList(dispatch, getState){
	const {objectSpecification, fromDate, toDate} = getState().icos;

	getCountriesForTimeInterval(objectSpecification, fromDate, toDate).then(
		countries => dispatch(gotCountries(objectSpecification, fromDate, toDate, countries)),
		err => dispatch(gotError(err))
	);
}

function gotCountries(objectSpecification, minDate, maxDate, countries){
	return {
		type: GOT_COUNTRIES,
		objectSpecification,
		minDate,
		maxDate,
		countries
	};
}*/

export const updateFilter = (filterId, filter) => dispatch => {
	dispatch({
		type: FILTER_UPDATED,
		update: {[filterId]: filter}
	});

	dispatch(fetchPropValueCounts);
};

function fetchPropValueCounts(dispatch, getState){
	const {objectSpecification, filters, fromDate, toDate} = getState().icos;

	getFilteredPropValueCounts(objectSpecification, filters, fromDate, toDate).then(
		propsAndVals => dispatch({
			type: GOT_PROP_VAL_COUNTS,
			propsAndVals,
			objectSpecification,
			fromDate,
			toDate
		}),
		err => dispatch(gotError(err))
	);
}

