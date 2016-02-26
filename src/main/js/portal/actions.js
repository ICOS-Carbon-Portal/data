import {getBinaryTable} from './backend'

export const FETCHING_STARTED = 'FETCHING_STARTED';
export const ERROR = 'ERROR';
export const FETCHED_TABLE = 'FETCHED_TABLE';
export const TABLE_CHOSEN = 'TABLE_CHOSEN';

function failWithError(error){
	return {
		type: ERROR,
		error
	};
}

function gotTable(table, tableIndex){
	return {
		type: FETCHED_TABLE,
		table,
		tableIndex
	};
}

const fetchTable = tableIndex => (dispatch, getState) => {
	const state = getState();

	if(state.status !== 'FETCHING' && state.chosenTable >= 0){

		dispatch({type: FETCHING_STARTED});

		const request = state.tables[state.chosenTable].request;

		getBinaryTable(request).then(
			tbl => dispatch(gotTable(tbl, tableIndex)),
			err => dispatch(failWithError(err))
		);

	}
}

export const chooseTable = tableIndex => dispatch => {
	dispatch({
		type: TABLE_CHOSEN,
		tableIndex
	});

	dispatch(fetchTable(tableIndex));
}

