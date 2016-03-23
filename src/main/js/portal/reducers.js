import { FETCHING_META, FETCHING_DATA, FETCHED_META, FETCHED_DATA, DATA_CHOSEN, ERROR} from './actions';
import {makeChartData} from './models/chartDataMaker';

export default function(state, action){

	switch(action.type){

		case FETCHING_META:
			return Object.assign({}, state, {status: FETCHING_META});

		case FETCHING_DATA:
			return Object.assign({}, state, {status: FETCHING_DATA});

		case FETCHED_META:
			return Object.assign({}, state, {
				status: FETCHED_META,
				meta: action.meta
			});

		case FETCHED_DATA:
			return (state.chosenObjectIdx === action.dataObjIdx)
				? Object.assign({}, state, {
					status: FETCHED_DATA,
					binTable: action.table
				})
				: state; //ignore the fetched data obj if another one got chosen while fetching

		case DATA_CHOSEN:
			return Object.assign({}, state, {chosenObjectIdx: action.dataObjIdx});

		case ERROR:
			return Object.assign({}, state, {status: ERROR, error: action.error});

		default:
			return state;
	}

}

