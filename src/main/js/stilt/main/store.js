import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import reducer from './reducer'
import {fetchInitData} from './actions'
//import config from './config';

const initState = {
	wdcggFormat: null,
	stations: [],
	selectedStation: null,
	selectedYear: null,
	footprints: null,
	footprint: null,
	desiredFootprint: null,
	playingMovie: false,
	options: {
		modelComponentsVisibility: {"co2.stilt": true, "co2.observed": true}
	},
	error: null
};

/*
function logger({ getState }) {
	return (next) => (action) => {
		console.log('will dispatch', action)

		// Call the next dispatch method in the middleware chain.
		let returnValue = next(action)

		console.log('state after dispatch', getState())

		// This will likely be the action itself, unless
		// a middleware further in chain changed it.
		return returnValue
	}
}
*/

export default function(){
	const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));//, logger));
	store.dispatch(fetchInitData);
	return store;
}

