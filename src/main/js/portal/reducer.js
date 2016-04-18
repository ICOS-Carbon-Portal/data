import { ROUTE_UPDATED} from './actions';
import { combineReducers } from 'redux';
import wdcggReducer from './reducerForWdcgg';
import icosReducer from './reducerForIcos';

const initState = "";

function routeReducer(state = initState, action){
	switch(action.type){

		case ROUTE_UPDATED:
			const currentRoute = window.location.hash.substr(1);

			if (currentRoute != action.route) {
				window.location.hash = action.route;
			}

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

