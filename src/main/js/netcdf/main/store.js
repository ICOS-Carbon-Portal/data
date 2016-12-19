import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {fetchCountriesTopo, fetchServices, selectGamma} from './actions.js';
import {ControlsHelper} from './models/ControlsHelper.js';

const initState = {
	controls: new ControlsHelper(),
	playingMovie: false,
	toasterData: null
};

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

let store = null;

export default function(){
	if(store == null){
		store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));
		store.dispatch(fetchCountriesTopo);
		store.dispatch(fetchServices);
		store.dispatch(selectGamma(4));
	}
	return store;
}