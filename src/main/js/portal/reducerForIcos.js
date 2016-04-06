import {FROM_DATE_SET, TO_DATE_SET, COUNTRY_SET, ERROR, GOT_GLOBAL_TIME_INTERVAL, GOT_COUNTRIES} from './actionsForIcos';
import config from './config';

const initState = {
	objectSpecification: config.wdcggSpec,
	fromDateMin: '1950-01-01T12:00:00Z',
	toDateMax: '2030-12-13T12:00:00Z',
	fromDate: null,
	toDate: null,
	countries: [],
	country: null
};

function makeAllowedDate(proposedValue, defaultValue, state){
	if(!proposedValue) return defaultValue;

	let maxAllowed = new Date(state.toDateMax);
	let minAllowed = new Date(state.fromDateMin);
	let date = new Date(proposedValue);

	if(date < minAllowed) return minAllowed.toISOString()
	else if(date > maxAllowed) return maxAllowed.toISOString()
	else return proposedValue;
}

export default function(state = initState, action){

	switch(action.type){
		case FROM_DATE_SET: {
			let newDate = makeAllowedDate(action.date, state.fromDateMin, state);
			return Object.assign({}, state, {fromDate: newDate});
		}
		case TO_DATE_SET: {
			let newDate = makeAllowedDate(action.date, state.toDateMax, state);
			return Object.assign({}, state, {toDate: newDate});
		}
		case COUNTRY_SET:
			return Object.assign({}, state, {country: action.country});

		case GOT_GLOBAL_TIME_INTERVAL:
			return state.objectSpecification === action.objectSpecification
				? Object.assign({}, state, {
					fromDate: action.min,
					fromDateMin: action.min,
					toDate: action.max,
					toDateMax: action.max
				})
				: state;

		case GOT_COUNTRIES:
			return (
				state.objectSpecification === action.objectSpecification &&
				state.fromDate === action.minDate &&
				state.toDate === action.maxDate
			)
			? Object.assign({}, state, {
				countries: action.countries
			})
			: state;

		default:
			return state;
	}

}

