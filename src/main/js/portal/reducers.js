import { FETCHING_STARTED, ERROR, FETCHED_TABLE } from './actions'

export default function(state, action){

	switch(action.type){

		case FETCHING_STARTED:
			return Object.assign({}, state, {status: 'FETCHING'});

		case ERROR:
			return Object.assign({}, state, {status: ERROR, error: action.error});

		case FETCHED_TABLE:
			return Object.assign({}, state, {status: 'FETCHED', binTable: action.table});

		default:
			return state;
	}

}

