import {FROM_DATE_SET, TO_DATE_SET, COUNTRY_SET} from './actionsForIcos';

const initState = {
	fromDate: '2010-01-01T12:00:00Z',
	toDate: '2010-01-01T12:00:00Z',
	contry: 'Sweden'
};

export default function(state = initState, action){

	switch(action.type){
		case 'FROM_DATE_SET':
			return Object.assign({}, state, {fromDate: action.date});
			
		case 'TO_DATE_SET':
			return Object.assign({}, state, {toDate: action.date});
			
		case 'COUNTRY_SET':
			return Object.assign({}, state, {country: action.country});

		default:
			return state;
	}

}

