import {FROM_DATE_SET, TO_DATE_SET, FILTER_UPDATED, ERROR, GOT_GLOBAL_TIME_INTERVAL, GOT_PROP_VAL_COUNTS} from './actionsForIcos';
import config from './config';
import { EmptyFilter } from './models/Filters';

const initCounts = {};
const initFilters = {};
config.wdcggProps.forEach(prop => {
	initCounts[prop.uri] = [];
	initFilters[prop.uri] = new EmptyFilter();
});

const initState = {
	objectSpecification: config.wdcggSpec,
	fromDateMin: '1950-01-01T12:00:00Z',
	toDateMax: '2030-12-13T12:00:00Z',
	fromDate: null,
	toDate: null,
	propValueCounts: initCounts,
	filters: initFilters
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

		case FILTER_UPDATED:
			return Object.assign({}, state, {
				filters: Object.assign({}, state.filters, action.update)
			});

		case GOT_GLOBAL_TIME_INTERVAL:
			return state.objectSpecification === action.objectSpecification
				? Object.assign({}, state, {
					fromDateMin: action.min,
					toDateMax: action.max
				})
				: state;

		case GOT_PROP_VAL_COUNTS:
			return (
				state.objectSpecification === action.objectSpecification &&
				state.fromDate === action.fromDate &&
				state.toDate === action.toDate
			)
			? Object.assign({}, state, {
				propValueCounts: action.counts
			})
			: state;

		default:
			return state;
	}

}

