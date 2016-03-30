import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import rootReducer from './reducers'
import {routeUpdated} from './actions'

const initialState = {
	meta: null,
	chosenObjectIdx: -1,
	binTable: null,
	status: 'INIT',
	error: null,
	route: null
};

export default function(){
	const store = createStore(
		rootReducer,
		initialState,
		applyMiddleware(thunkMiddleware)
	);

	store.dispatch(routeUpdated());

	return store;
}

