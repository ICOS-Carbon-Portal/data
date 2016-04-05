import {FROM_DATE_SET, TO_DATE_SET, COUNTRY_SET, ERROR, GOT_GLOBAL_TIME_INTERVAL} from './actionsForIcos';
import config from './config';

const initState = {
	objectSpecification: config.wdcggSpec,
	fromDateMin: '1950-01-01T12:00:00Z',
	toDateMax: '2030-12-13T12:00:00Z',
	fromDate: null,
	toDate: null,
	contry: 'Sweden'
};

export default function(state = initState, action){

	switch(action.type){
		case FROM_DATE_SET:
			return Object.assign({}, state, {fromDate: action.date});
			
		case TO_DATE_SET:
			return Object.assign({}, state, {toDate: action.date});
			
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

		default:
			return state;
	}

}

