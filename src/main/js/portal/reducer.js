import { ROUTE_UPDATED} from './actions';
import { combineReducers } from 'redux';
import wdcggReducer from './reducerForWdcgg';
import icosReducer from './reducerForIcos';

const initState = "";

function routeReducer(state = initState, action){
	switch(action.type){

		case ROUTE_UPDATED:
			return action.route;

		default:
			return state;
	}
}

export default combineReducers({
	route: routeReducer,
	wdcgg: wdcggReducer,
	icos: icosReducer
});

