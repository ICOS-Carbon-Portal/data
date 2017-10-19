import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {fetchUserInfo, getAllSpecTables, updateRoute, pushToPortalUsage} from './actions';

// function logger({ getState }) {
// 	return (next) => (action) => {
// 		console.log('will dispatch', action)
//
// 		// Call the next dispatch method in the middleware chain.
// 		let returnValue = next(action)
//
// 		console.log('state after dispatch', getState())
//
// 		// This will likely be the action itself, unless
// 		// a middleware further in chain changed it.
// 		return returnValue
// 	}
// }

const hash = window.location.hash.substr(1);
const route = hash.split('?')[0];

export default function(){
	const store = createStore(reducer, undefined, applyMiddleware(thunkMiddleware));
	store.dispatch(updateRoute(route));
	store.dispatch(fetchUserInfo(true));
	store.dispatch(getAllSpecTables(hash));
	// store.dispatch(pushToPortalUsage({'filter.$last': {IP}}));
	return store;
}
