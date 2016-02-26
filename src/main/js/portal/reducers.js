import { FETCHING_STARTED, ERROR, FETCHED_TABLE, TABLE_CHOSEN } from './actions'

export default function(state, action){

	switch(action.type){

		case FETCHING_STARTED:
			return Object.assign({}, state, {status: 'FETCHING'});

		case ERROR:
			return Object.assign({}, state, {status: ERROR, error: action.error});

		case FETCHED_TABLE:
			return (state.chosenTable === action.tableIndex)
				? Object.assign({}, state, {
					status: 'FETCHED',
					xAxisColumn: -1,
					yAxisColumn: -1,
					binTable: action.table
				})
				: state; //ignore the fetched table if another one got chosen while fetching

		case TABLE_CHOSEN:
			return Object.assign({}, state, {chosenTable: action.tableIndex});

		default:
			return state;
	}

}

