import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import reducer from './reducer'
import {fetchTableFormat, fetchStationInfo, fetchObservationData} from './actions'
//import config from './config';

const initState = {
	wdcggFormat: null,
	stations: [],
	selectedStation: null,
	selectedYear: null,
	error: null
};

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

export default function(){
	const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));
	store.dispatch(fetchTableFormat);
	store.dispatch(fetchStationInfo);
	return store;
}

