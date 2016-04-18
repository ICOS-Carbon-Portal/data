import { FETCHING_META, FETCHING_DATA, FETCHED_META, FETCHED_DATA, DATA_CHOSEN, ERROR} from './actionsForWdcgg';

const initState = {
	meta: null,
	format: null,
	tableFormat: null,
	binTable: null,
	status: 'INIT',
	error: null
};

export default function(state = initState, action){

	switch(action.type){
		case FETCHING_META:
			return Object.assign({}, state, {status: FETCHING_META});

		case FETCHING_DATA:
			return Object.assign({}, state, {status: FETCHING_DATA});

		case FETCHED_META:
			return Object.assign({}, state, {
				status: FETCHED_META,
				tableFormat: action.tableFormat
			});

		case FETCHED_DATA:
			return (state.dataObjectId === action.dataObjId)
				? Object.assign({}, state, {
					status: FETCHED_DATA,
					binTable: action.binTable,
					format: action.format
				})
				: state; //ignore the fetched data obj if another one got chosen while fetching

		case DATA_CHOSEN:
			return Object.assign({}, state, {dataObjectId: action.dataObjectId});

		case ERROR:
			return Object.assign({}, state, {status: ERROR, error: action.error});

		default:
			return state;
	}

}

