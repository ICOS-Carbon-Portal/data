import {getMetaData, getBinaryTable} from './backend'

export const FETCHING_STARTED = 'FETCHING_STARTED';
export const ERROR = 'ERROR';
export const FETCHED_META = 'FETCHED_META';
export const FETCHED_TABLE = 'FETCHED_TABLE';
export const TABLE_CHOSEN = 'TABLE_CHOSEN';
export const YAXIS_CHOSEN = 'YAXIS_CHOSEN';

function failWithError(error){
	return {
		type: ERROR,
		error
	};
}

function gotMeta(tables){
	return {
		type: FETCHED_META,
		tables
	};
}

function gotTable(table, tableIndex){
	return {
		type: FETCHED_TABLE,
		table,
		tableIndex
	};
}

export const fetchMetaData = searchObj => (dispatch, getState) => {
	const state = getState();

	if(state.status !== 'FETCHING'){

		dispatch({type: FETCHING_STARTED});

		getMetaData(searchObj).then(
			meta => {
				dispatch(gotMeta(meta));
				dispatch(chooseTable(0));
			},
			err => {
				dispatch(failWithError(err));
			}
		);
	}
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

export function yAxisChosen(yAxisColumn){
	return {
		type: YAXIS_CHOSEN,
		yAxisColumn
	}
}

export const chooseTable = tableIndex => dispatch => {
	dispatch({
		type: TABLE_CHOSEN,
		tableIndex
	});

	dispatch(fetchTable(tableIndex));
}

