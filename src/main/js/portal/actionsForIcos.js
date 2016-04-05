import {getGlobalTimeInterval, getCountriesForTimeInterval} from './backend';

export const FROM_DATE_SET = 'FROM_DATE_SET';
export const TO_DATE_SET = 'TO_DATE_SET';
export const COUNTRY_SET = 'COUNTRY_SET';
export const ERROR = 'ERROR';
export const GOT_GLOBAL_TIME_INTERVAL = 'GOT_GLOBAL_TIME_INTERVAL';

export function fromDateSet(date){
	return {
		type: FROM_DATE_SET,
		date
	};
}

export function toDateSet(date){
	return {
		type: TO_DATE_SET,
		date
	};
}

export function countrySet(country){
	return {
		type: COUNTRY_SET,
		country
	};
}

export function fetchGlobalTimeInterval(dispatch, getState){
	const objSpec = getState().icos.objectSpecification;

	getGlobalTimeInterval(objSpec).then(
		interval => dispatch(gotGlobalTimeInterval(objSpec, interval)),
		err => dispatch(gotError(err))
	);
}

function gotError(error){
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

